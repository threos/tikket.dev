import type { TeamRoleDto } from "@calcom/features/teams/lib/types";

// UI mirror of the role rules enforced by the `viewer.teams` router. These only decide what we show;
// the server stays the source of truth and rejects anything these helpers would hide.

export const TEAM_ROLES: readonly TeamRoleDto[] = ["MEMBER", "ADMIN", "OWNER"];

const ROLE_RANK: Record<TeamRoleDto, number> = { MEMBER: 0, ADMIN: 1, OWNER: 2 };

export function isTeamAdminOrOwner(role: TeamRoleDto | null | undefined): boolean {
  return role === "ADMIN" || role === "OWNER";
}

export function canEditTeam(role: TeamRoleDto | null | undefined): boolean {
  return isTeamAdminOrOwner(role);
}

export function canDeleteTeam(role: TeamRoleDto | null | undefined): boolean {
  return role === "OWNER";
}

export function canInviteMembers(role: TeamRoleDto | null | undefined): boolean {
  return isTeamAdminOrOwner(role);
}

export function assignableRoles(actorRole: TeamRoleDto | null | undefined): TeamRoleDto[] {
  if (actorRole === "OWNER") return ["MEMBER", "ADMIN", "OWNER"];
  if (actorRole === "ADMIN") return ["MEMBER", "ADMIN"];
  return [];
}

export function canManageMember(actorRole: TeamRoleDto | null | undefined, targetRole: TeamRoleDto): boolean {
  if (actorRole === "OWNER") return true;
  if (actorRole === "ADMIN") return ROLE_RANK[targetRole] <= ROLE_RANK.ADMIN;
  return false;
}

type MemberLike = { userId: number; role: TeamRoleDto; accepted: boolean };

export function countAcceptedOwners(members: readonly MemberLike[]): number {
  let owners = 0;
  for (const member of members) {
    if (member.role === "OWNER" && member.accepted) owners++;
  }
  return owners;
}

function isLastOwner(target: MemberLike, acceptedOwnerCount: number): boolean {
  return target.role === "OWNER" && target.accepted && acceptedOwnerCount <= 1;
}

export type MemberActions = {
  canChangeRole: boolean;
  canRemove: boolean;
  roleOptions: TeamRoleDto[];
};

export function getMemberActions({
  actorRole,
  actorUserId,
  target,
  acceptedOwnerCount,
}: {
  actorRole: TeamRoleDto | null | undefined;
  actorUserId: number | null | undefined;
  target: MemberLike;
  acceptedOwnerCount: number;
}): MemberActions {
  const none: MemberActions = { canChangeRole: false, canRemove: false, roleOptions: [] };
  if (!canManageMember(actorRole, target.role)) return none;

  const lastOwner = isLastOwner(target, acceptedOwnerCount);
  const isSelf = actorUserId === target.userId;
  const roleOptions = assignableRoles(actorRole);

  return {
    // Changing a pending invite's role is allowed: it decides what they join as.
    canChangeRole: !lastOwner && roleOptions.length > 1,
    // Removing yourself is "leave team", which lives in the team profile danger zone.
    canRemove: !lastOwner && !isSelf,
    roleOptions,
  };
}

export function canLeaveTeam(
  role: TeamRoleDto | null | undefined,
  acceptedOwnerCount: number | null
): boolean {
  if (!role) return false;
  if (role !== "OWNER") return true;
  // Unknown owner count (e.g. members hidden on a private team): let the server decide.
  if (acceptedOwnerCount === null) return true;
  return acceptedOwnerCount > 1;
}
