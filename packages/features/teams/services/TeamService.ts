import { TeamSlugTakenError } from "@calcom/features/teams/lib/errors";
import { isTeamManagerRole } from "@calcom/features/teams/lib/teamRoles";
import { isTopLevelTeam } from "@calcom/features/teams/lib/teamScope";
import type {
  RRResetIntervalDto,
  RRTimestampBasisDto,
  TeamDto,
  TeamWithMembershipDto,
} from "@calcom/features/teams/lib/types";
import type {
  TeamMembershipRepository,
  TeamMembershipWithTeamRecord,
} from "@calcom/features/teams/repositories/TeamMembershipRepository";
import type {
  TeamRecord,
  TeamRepository,
  TeamUpdateData,
} from "@calcom/features/teams/repositories/TeamRepository";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import slugify from "@calcom/lib/slugify";

export interface ITeamServiceDeps {
  teamRepository: TeamRepository;
  teamMembershipRepository: TeamMembershipRepository;
}

export type CreateTeamInput = {
  name: string;
  slug: string;
};

export type UpdateTeamInput = {
  name?: string;
  slug?: string;
  bio?: string | null;
  isPrivate?: boolean;
  hideBookATeamMember?: boolean;
  rrResetInterval?: RRResetIntervalDto;
  rrTimestampBasis?: RRTimestampBasisDto;
};

export function toTeamDto(team: TeamRecord): TeamDto {
  return {
    id: team.id,
    name: team.name,
    slug: team.slug,
    bio: team.bio,
    logoUrl: team.logoUrl,
    isPrivate: team.isPrivate,
    hideBookATeamMember: team.hideBookATeamMember,
    // The column is nullable but defaults to MONTH, which is also what getLuckyUser assumes for null.
    rrResetInterval: team.rrResetInterval ?? "MONTH",
    rrTimestampBasis: team.rrTimestampBasis,
  };
}

function toTeamWithMembershipDto(membership: TeamMembershipWithTeamRecord): TeamWithMembershipDto {
  const { _count, ...team } = membership.team;
  return {
    ...toTeamDto(team),
    role: membership.role,
    accepted: membership.accepted,
    memberCount: _count.members,
  };
}

export class TeamService {
  constructor(private readonly deps: ITeamServiceDeps) {}

  async createTeam(userId: number, input: CreateTeamInput): Promise<TeamDto> {
    const name = input.name.trim();
    if (!name) {
      throw new ErrorWithCode(ErrorCode.BadRequest, "Please enter a team name");
    }
    const slug = this.normalizeSlug(input.slug);

    const team = await this.withSlugConflictMessage(
      this.deps.teamRepository.create({
        name,
        slug,
        members: [{ userId, role: "OWNER", accepted: true }],
      })
    );
    return toTeamDto(team);
  }

  async updateTeam(teamId: number, actorId: number, input: UpdateTeamInput): Promise<TeamDto> {
    await this.assertTopLevelTeamExists(teamId);
    const membership = await this.getAcceptedMembershipOrThrow(teamId, actorId);
    if (!isTeamManagerRole(membership.role)) {
      throw new ErrorWithCode(ErrorCode.Forbidden, "Only team admins and owners can change team settings");
    }

    const data: TeamUpdateData = {
      bio: input.bio,
      isPrivate: input.isPrivate,
      hideBookATeamMember: input.hideBookATeamMember,
      rrResetInterval: input.rrResetInterval,
      rrTimestampBasis: input.rrTimestampBasis,
    };

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) {
        throw new ErrorWithCode(ErrorCode.BadRequest, "Please enter a team name");
      }
      data.name = name;
    }

    if (input.slug !== undefined) {
      data.slug = this.normalizeSlug(input.slug);
    }

    const team = await this.withSlugConflictMessage(this.deps.teamRepository.update({ id: teamId, data }));
    return toTeamDto(team);
  }

  async deleteTeam(teamId: number, actorId: number): Promise<{ id: number }> {
    await this.assertTopLevelTeamExists(teamId);
    const membership = await this.getAcceptedMembershipOrThrow(teamId, actorId);
    if (membership.role !== "OWNER") {
      throw new ErrorWithCode(ErrorCode.Forbidden, "Only team owners can delete the team");
    }
    return this.deps.teamRepository.delete({ id: teamId });
  }

  async listTeamsForUser(userId: number): Promise<TeamWithMembershipDto[]> {
    const memberships = await this.deps.teamMembershipRepository.findAllByUserIdIncludeTeam({ userId });
    return memberships.map(toTeamWithMembershipDto);
  }

  async getTeam(teamId: number, userId: number): Promise<TeamWithMembershipDto> {
    const membership = await this.deps.teamMembershipRepository.findByUserIdAndTeamIdIncludeTeam({
      userId,
      teamId,
    });
    if (membership && !isTopLevelTeam(membership.team)) {
      throw new ErrorWithCode(ErrorCode.NotFound, "This team no longer exists");
    }
    if (!membership || !membership.accepted) {
      throw new ErrorWithCode(ErrorCode.Forbidden, "You are not a member of this team");
    }
    return toTeamWithMembershipDto(membership);
  }

  private normalizeSlug(rawSlug: string): string {
    const slug = slugify(rawSlug);
    if (!slug) {
      throw new ErrorWithCode(
        ErrorCode.BadRequest,
        "Please enter a valid team URL using letters, numbers and dashes"
      );
    }
    return slug;
  }

  private async withSlugConflictMessage<T>(write: Promise<T>): Promise<T> {
    try {
      return await write;
    } catch (error) {
      if (error instanceof TeamSlugTakenError) {
        throw new ErrorWithCode(ErrorCode.Conflict, "This team URL is already taken");
      }
      throw error;
    }
  }

  private async assertTopLevelTeamExists(teamId: number): Promise<void> {
    const team = await this.deps.teamRepository.findById({ id: teamId });
    if (!team || !isTopLevelTeam(team)) {
      throw new ErrorWithCode(ErrorCode.NotFound, "This team no longer exists");
    }
  }

  private async getAcceptedMembershipOrThrow(teamId: number, userId: number) {
    const membership = await this.deps.teamMembershipRepository.findByUserIdAndTeamId({ userId, teamId });
    if (!membership || !membership.accepted) {
      throw new ErrorWithCode(ErrorCode.Forbidden, "You are not a member of this team");
    }
    return membership;
  }
}
