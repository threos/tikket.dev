import type { TeamRoleDto } from "./types";

export const ALL_TEAM_ROLES: readonly TeamRoleDto[] = ["MEMBER", "ADMIN", "OWNER"];

export const TEAM_MANAGER_ROLES: readonly TeamRoleDto[] = ["ADMIN", "OWNER"];

export function isTeamManagerRole(role: TeamRoleDto): boolean {
  return TEAM_MANAGER_ROLES.includes(role);
}

/**
 * Whether `actorRole` may change or remove a member that currently has `targetRole`,
 * optionally moving them to `newRole`. Owners can manage anyone; admins can only manage
 * members and admins and can never hand out the owner role.
 */
export function canManageMember({
  actorRole,
  targetRole,
  newRole,
}: {
  actorRole: TeamRoleDto;
  targetRole: TeamRoleDto;
  newRole?: TeamRoleDto;
}): boolean {
  if (actorRole === "OWNER") return true;
  if (actorRole !== "ADMIN") return false;
  if (targetRole === "OWNER") return false;
  return newRole !== "OWNER";
}

export function canInviteWithRole({
  actorRole,
  role,
}: {
  actorRole: TeamRoleDto;
  role: TeamRoleDto;
}): boolean {
  if (!isTeamManagerRole(actorRole)) return false;
  if (role === "OWNER") return actorRole === "OWNER";
  return true;
}
