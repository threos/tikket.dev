import { createContainer } from "@calcom/features/di/di";
import {
  type TeamMembershipService,
  moduleLoader as teamMembershipServiceModuleLoader,
} from "./TeamMembershipService.module";

const teamMembershipServiceContainer = createContainer();

export function getTeamMembershipService(): TeamMembershipService {
  teamMembershipServiceModuleLoader.loadModule(teamMembershipServiceContainer);
  return teamMembershipServiceContainer.get<TeamMembershipService>(teamMembershipServiceModuleLoader.token);
}
