import { createContainer } from "@calcom/features/di/di";
import {
  type TeamPermissionService,
  moduleLoader as teamPermissionServiceModuleLoader,
} from "./TeamPermissionService.module";

const teamPermissionServiceContainer = createContainer();

export function getTeamPermissionService(): TeamPermissionService {
  teamPermissionServiceModuleLoader.loadModule(teamPermissionServiceContainer);
  return teamPermissionServiceContainer.get<TeamPermissionService>(teamPermissionServiceModuleLoader.token);
}
