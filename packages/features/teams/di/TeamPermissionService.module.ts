import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { TeamPermissionService } from "@calcom/features/teams/services/TeamPermissionService";
import { moduleLoader as teamMembershipRepositoryModuleLoader } from "./TeamMembershipRepository.module";
import { TEAMS_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = TEAMS_DI_TOKENS.TEAM_PERMISSION_SERVICE;
const moduleToken = TEAMS_DI_TOKENS.TEAM_PERMISSION_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: TeamPermissionService,
  depsMap: {
    teamMembershipRepository: teamMembershipRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { TeamPermissionService };
