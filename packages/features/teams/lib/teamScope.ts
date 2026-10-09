/** Tikket's teams API manages top-level teams only; organizations and their sub-teams are out of scope. */
export function isTopLevelTeam(team: { isOrganization: boolean; parentId: number | null }): boolean {
  return !team.isOrganization && team.parentId === null;
}
