import { randomBytes } from "node:crypto";
import { sendTeamInviteEmail } from "@calcom/emails/organization-email-service";
import { DEFAULT_HOST_PRIORITY, DEFAULT_HOST_WEIGHT } from "@calcom/features/teams/lib/assignmentStrategies";
import { TeamOwnerMinimumError } from "@calcom/features/teams/lib/errors";
import { maskEmail } from "@calcom/features/teams/lib/maskEmail";
import { canInviteWithRole, canManageMember } from "@calcom/features/teams/lib/teamRoles";
import { isTopLevelTeam } from "@calcom/features/teams/lib/teamScope";
import type { TeamInviteResultDto, TeamMemberDto, TeamRoleDto } from "@calcom/features/teams/lib/types";
import type {
  AcceptedOwnersGuard,
  TeamMembershipHostInput,
  TeamMembershipRecord,
  TeamMembershipRepository,
  TeamMembershipWithUserRecord,
} from "@calcom/features/teams/repositories/TeamMembershipRepository";
import type { TeamRecord, TeamRepository } from "@calcom/features/teams/repositories/TeamRepository";
import type {
  UserLookupRecord,
  UserLookupRepository,
} from "@calcom/features/teams/repositories/UserLookupRepository";
import type { VerificationTokenRepository } from "@calcom/features/teams/repositories/VerificationTokenRepository";
import { getTranslation } from "@calcom/i18n/server";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

const log = logger.getSubLogger({ prefix: ["TeamMembershipService"] });

const INVITE_TOKEN_EXPIRY_DAYS = 7;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export interface ITeamMembershipServiceDeps {
  teamRepository: TeamRepository;
  teamMembershipRepository: TeamMembershipRepository;
  userLookupRepository: UserLookupRepository;
  verificationTokenRepository: VerificationTokenRepository;
}

export type InviteMemberInput = {
  emailOrUsername: string;
  role: TeamRoleDto;
};

export function toTeamMemberDto(membership: TeamMembershipWithUserRecord): TeamMemberDto {
  return {
    membershipId: membership.id,
    userId: membership.userId,
    name: membership.user.name,
    // Anyone can create a team and invite a user by username, so a pending invite must not reveal
    // the invitee's address until they accept and actually join.
    email: membership.accepted ? membership.user.email : maskEmail(membership.user.email),
    username: membership.user.username,
    avatarUrl: membership.user.avatarUrl,
    role: membership.role,
    accepted: membership.accepted,
  };
}

/**
 * Changing or removing an accepted owner must leave the team with another accepted owner. A pending
 * owner invite does not count as an owner, so removing it can never orphan the team.
 */
function ownersGuardFor(membership: TeamMembershipRecord): AcceptedOwnersGuard | undefined {
  if (membership.role !== "OWNER" || !membership.accepted) return undefined;
  return { minAcceptedOwners: 1 };
}

export class TeamMembershipService {
  constructor(private readonly deps: ITeamMembershipServiceDeps) {}

  async listMembers(teamId: number, actorId: number): Promise<TeamMemberDto[]> {
    const team = await this.getTopLevelTeamOrThrow(teamId);
    const actorMembership = await this.getAcceptedMembershipOrThrow(teamId, actorId);

    // Plain members of a private team only get their own row, so the settings page can still render it.
    if (team.isPrivate && actorMembership.role === "MEMBER") {
      const ownMembership = await this.deps.teamMembershipRepository.findByUserIdAndTeamIdIncludeUser({
        userId: actorId,
        teamId,
      });
      return ownMembership ? [toTeamMemberDto(ownMembership)] : [];
    }

    const memberships = await this.deps.teamMembershipRepository.findAllByTeamIdIncludeUser({ teamId });
    return memberships.map(toTeamMemberDto);
  }

  async inviteMember(
    teamId: number,
    actorId: number,
    input: InviteMemberInput
  ): Promise<TeamInviteResultDto> {
    const team = await this.getTopLevelTeamOrThrow(teamId);
    const actorMembership = await this.getAcceptedMembershipOrThrow(teamId, actorId);
    if (!canInviteWithRole({ actorRole: actorMembership.role, role: input.role })) {
      throw new ErrorWithCode(
        ErrorCode.Forbidden,
        input.role === "OWNER"
          ? "Only team owners can invite new owners"
          : "Only team admins and owners can invite members"
      );
    }

    const identifier = input.emailOrUsername.trim();
    const isEmail = identifier.includes("@");
    const invitee = isEmail
      ? await this.deps.userLookupRepository.findByEmail({ email: identifier })
      : await this.deps.userLookupRepository.findByUsername({ username: identifier });

    if (!invitee && !isEmail) {
      throw new ErrorWithCode(ErrorCode.NotFound, "No Tikket account uses that username");
    }

    const actor = await this.deps.userLookupRepository.findById({ id: actorId });

    if (invitee) {
      const existingMembership = await this.deps.teamMembershipRepository.findByUserIdAndTeamId({
        userId: invitee.id,
        teamId,
      });
      if (existingMembership) {
        return { status: "already_member", inviteLink: null, emailSent: false };
      }

      await this.deps.teamMembershipRepository.create({
        userId: invitee.id,
        teamId,
        role: input.role,
        accepted: false,
      });

      const inviteLink = `${WEBAPP_URL}/settings/teams`;
      const emailSent = await this.trySendInviteEmail({
        actor,
        to: invitee.email,
        teamName: team.name,
        joinLink: inviteLink,
        isCalcomMember: true,
      });
      return { status: "invited_existing_user", inviteLink, emailSent };
    }

    // Signup turns an invite token into a MEMBER membership and the token can't carry a role,
    // so accepting a higher role here would silently downgrade the invitee.
    if (input.role !== "MEMBER") {
      throw new ErrorWithCode(
        ErrorCode.BadRequest,
        "People without a Tikket account join as members. Invite them as a member, then change their role after they sign up"
      );
    }

    const email = identifier.toLowerCase();
    const token = randomBytes(32).toString("hex");
    await this.deps.verificationTokenRepository.create({
      identifier: email,
      token,
      expires: new Date(Date.now() + INVITE_TOKEN_EXPIRY_DAYS * DAY_IN_MS),
      expiresInDays: INVITE_TOKEN_EXPIRY_DAYS,
      teamId,
    });

    // The signup page prefixes callbackUrl with `${WEBAPP_URL}/`, so it must not start with a slash.
    const inviteLink = `${WEBAPP_URL}/signup?token=${token}&callbackUrl=settings/teams`;
    const emailSent = await this.trySendInviteEmail({
      actor,
      to: email,
      teamName: team.name,
      joinLink: inviteLink,
      isCalcomMember: false,
    });
    return { status: "invited_new_user", inviteLink, emailSent };
  }

  async changeMemberRole(
    teamId: number,
    actorId: number,
    targetUserId: number,
    role: TeamRoleDto
  ): Promise<TeamMemberDto> {
    await this.getTopLevelTeamOrThrow(teamId);
    const actorMembership = await this.getAcceptedMembershipOrThrow(teamId, actorId);
    const targetMembership = await this.getMembershipOrThrow(
      teamId,
      targetUserId,
      "That person is not a member of this team"
    );

    if (
      !canManageMember({ actorRole: actorMembership.role, targetRole: targetMembership.role, newRole: role })
    ) {
      throw new ErrorWithCode(
        ErrorCode.Forbidden,
        actorMembership.role === "MEMBER"
          ? "Only team admins and owners can change member roles"
          : "Only team owners can change an owner's role or make someone an owner"
      );
    }

    const updated = await this.withLastOwnerMessage(
      this.deps.teamMembershipRepository.updateRole({
        id: targetMembership.id,
        teamId,
        role,
        ownersGuard: role === "OWNER" ? undefined : ownersGuardFor(targetMembership),
      }),
      "You can't change the role of the last owner of the team. Make someone else an owner first"
    );
    return toTeamMemberDto(updated);
  }

  async removeMember(teamId: number, actorId: number, targetUserId: number): Promise<{ success: true }> {
    await this.getTopLevelTeamOrThrow(teamId);
    const actorMembership = await this.getAcceptedMembershipOrThrow(teamId, actorId);
    const targetMembership = await this.getMembershipOrThrow(
      teamId,
      targetUserId,
      "That person is not a member of this team"
    );

    if (!canManageMember({ actorRole: actorMembership.role, targetRole: targetMembership.role })) {
      throw new ErrorWithCode(
        ErrorCode.Forbidden,
        actorMembership.role === "MEMBER"
          ? "Only team admins and owners can remove members"
          : "Only team owners can remove an owner"
      );
    }

    await this.withLastOwnerMessage(
      this.deps.teamMembershipRepository.deleteByIdIncludeTeamEventTypeAssignments({
        id: targetMembership.id,
        userId: targetUserId,
        teamId,
        ownersGuard: ownersGuardFor(targetMembership),
      }),
      "You can't remove the last owner of the team. Make someone else an owner first"
    );
    return { success: true };
  }

  async acceptInvite(teamId: number, userId: number): Promise<{ success: true }> {
    await this.getTopLevelTeamOrThrow(teamId);
    const membership = await this.getMembershipOrThrow(
      teamId,
      userId,
      "You don't have an invitation to this team"
    );
    if (membership.accepted) return { success: true };

    const hosts = await this.buildAssignAllTeamMembersHosts(membership);
    await this.deps.teamMembershipRepository.updateAcceptedIncludeHosts({ id: membership.id, hosts });
    return { success: true };
  }

  // Signup-with-invite-token creates the accepted membership outside this service, so it calls this
  // afterwards to give the new member the same "assign all team members" hosts acceptInvite would.
  async addToAssignAllTeamMembersEventTypes(teamId: number, userId: number): Promise<void> {
    const membership = await this.deps.teamMembershipRepository.findByUserIdAndTeamId({ userId, teamId });
    if (!membership?.accepted) return;
    const hosts = await this.buildAssignAllTeamMembersHosts(membership);
    if (hosts.length === 0) return;
    await this.deps.teamMembershipRepository.createHosts({ hosts });
  }

  async declineInvite(teamId: number, userId: number): Promise<{ success: true }> {
    await this.getTopLevelTeamOrThrow(teamId);
    const membership = await this.getMembershipOrThrow(
      teamId,
      userId,
      "You don't have an invitation to this team"
    );
    if (membership.accepted) {
      throw new ErrorWithCode(ErrorCode.BadRequest, "You already joined this team. Leave the team instead");
    }
    await this.deps.teamMembershipRepository.deleteById({ id: membership.id });
    return { success: true };
  }

  async leaveTeam(teamId: number, userId: number): Promise<{ success: true }> {
    await this.getTopLevelTeamOrThrow(teamId);
    const membership = await this.getAcceptedMembershipOrThrow(teamId, userId);
    await this.withLastOwnerMessage(
      this.deps.teamMembershipRepository.deleteByIdIncludeTeamEventTypeAssignments({
        id: membership.id,
        userId,
        teamId,
        ownersGuard: ownersGuardFor(membership),
      }),
      "You are the last owner of this team. Make someone else an owner or delete the team before leaving"
    );
    return { success: true };
  }

  /**
   * `assignAllTeamMembers` is only a stored flag: booking and slot calculation read the Host table,
   * so a member joining such an event type's team needs explicit host rows.
   */
  private async buildAssignAllTeamMembersHosts(
    membership: TeamMembershipRecord
  ): Promise<TeamMembershipHostInput[]> {
    const eventTypes = await this.deps.teamMembershipRepository.findAssignAllTeamMembersEventTypesByTeamId({
      teamId: membership.teamId,
    });

    const hosts: TeamMembershipHostInput[] = [];
    for (const eventType of eventTypes) {
      // Managed event types assign members through child event types, not host rows.
      if (eventType.schedulingType !== "ROUND_ROBIN" && eventType.schedulingType !== "COLLECTIVE") continue;
      hosts.push({
        userId: membership.userId,
        eventTypeId: eventType.id,
        memberId: membership.id,
        isFixed: eventType.schedulingType === "COLLECTIVE",
        priority: DEFAULT_HOST_PRIORITY,
        weight: DEFAULT_HOST_WEIGHT,
      });
    }
    return hosts;
  }

  private async withLastOwnerMessage<T>(write: Promise<T>, message: string): Promise<T> {
    try {
      return await write;
    } catch (error) {
      if (error instanceof TeamOwnerMinimumError) {
        throw new ErrorWithCode(ErrorCode.BadRequest, message);
      }
      throw error;
    }
  }

  private async getTopLevelTeamOrThrow(teamId: number): Promise<TeamRecord> {
    const team = await this.deps.teamRepository.findById({ id: teamId });
    if (!team || !isTopLevelTeam(team)) {
      throw new ErrorWithCode(ErrorCode.NotFound, "This team no longer exists");
    }
    return team;
  }

  private async getMembershipOrThrow(
    teamId: number,
    userId: number,
    notFoundMessage: string
  ): Promise<TeamMembershipRecord> {
    const membership = await this.deps.teamMembershipRepository.findByUserIdAndTeamId({ userId, teamId });
    if (!membership) {
      throw new ErrorWithCode(ErrorCode.NotFound, notFoundMessage);
    }
    return membership;
  }

  private async getAcceptedMembershipOrThrow(teamId: number, userId: number): Promise<TeamMembershipRecord> {
    const membership = await this.deps.teamMembershipRepository.findByUserIdAndTeamId({ userId, teamId });
    if (!membership || !membership.accepted) {
      throw new ErrorWithCode(ErrorCode.Forbidden, "You are not a member of this team");
    }
    return membership;
  }

  private async trySendInviteEmail({
    actor,
    to,
    teamName,
    joinLink,
    isCalcomMember,
  }: {
    actor: UserLookupRecord | null;
    to: string;
    teamName: string;
    joinLink: string;
    isCalcomMember: boolean;
  }): Promise<boolean> {
    // Invites must still work on self-hosted instances without email configured;
    // the caller gets the link back and can share it manually.
    try {
      const translate = await getTranslation(actor?.locale ?? "en", "common");
      await sendTeamInviteEmail({
        language: translate,
        from: actor?.name || actor?.email || teamName,
        to,
        teamName,
        joinLink,
        isCalcomMember,
        isAutoJoin: false,
        isOrg: false,
        parentTeamName: undefined,
        isExistingUserMovedToOrg: false,
        prevLink: null,
        newLink: null,
      });
      return true;
    } catch (error) {
      log.error("Failed to send team invite email", safeStringify({ to, teamName, error }));
      return false;
    }
  }
}
