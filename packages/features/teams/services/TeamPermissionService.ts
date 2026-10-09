import type { TeamRoleDto } from "@calcom/features/teams/lib/types";
import type { TeamMembershipRepository } from "@calcom/features/teams/repositories/TeamMembershipRepository";

export type CheckTeamPermissionInput = {
  userId: number;
  teamId: number;
  /**
   * Kept for call-site compatibility with Cal.com's PBAC API. Tikket has no custom roles,
   * so the decision is made by `fallbackRoles` only.
   */
  permission: string;
  /**
   * Roles that grant the permission. When omitted or empty nobody has the permission, so a call site
   * that forgets the roles fails closed; pass every role explicitly for read-style access.
   */
  fallbackRoles?: readonly TeamRoleDto[];
};

export type GetTeamIdsWithPermissionInput = {
  userId: number;
  permission: string;
  fallbackRoles?: readonly TeamRoleDto[];
  /** Accepted for call-site compatibility; membership already scopes the result. */
  orgId?: number;
};

export interface ITeamPermissionServiceDeps {
  teamMembershipRepository: TeamMembershipRepository;
}

/**
 * Role-based replacement for Cal.com's PBAC PermissionCheckService. A user has a permission on a team
 * when they hold an accepted membership with one of the allowed roles in that team, or in the team's
 * parent organization (org admins manage their sub-teams, mirroring Cal.com's fallback behaviour).
 */
export class TeamPermissionService {
  constructor(private readonly deps: ITeamPermissionServiceDeps) {}

  async checkPermission({ userId, teamId, fallbackRoles }: CheckTeamPermissionInput): Promise<boolean> {
    if (!fallbackRoles?.length) return false;
    const memberships = await this.deps.teamMembershipRepository.findAcceptedByUserIdInTeamOrParent({
      userId,
      teamId,
    });
    return memberships.some((membership) => fallbackRoles.includes(membership.role));
  }

  async hasPermission(input: CheckTeamPermissionInput): Promise<boolean> {
    return this.checkPermission(input);
  }

  async getTeamIdsWithPermission({
    userId,
    fallbackRoles,
  }: GetTeamIdsWithPermissionInput): Promise<number[]> {
    if (!fallbackRoles?.length) return [];
    const memberships =
      await this.deps.teamMembershipRepository.findAcceptedByUserIdAndRolesIncludeChildTeamIds({
        userId,
        roles: [...fallbackRoles],
      });

    const teamIds = new Set<number>();
    for (const membership of memberships) {
      teamIds.add(membership.teamId);
      for (const child of membership.team.children) {
        teamIds.add(child.id);
      }
    }
    return Array.from(teamIds);
  }
}
