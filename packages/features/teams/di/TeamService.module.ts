import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { TeamService } from "@calcom/features/teams/services/TeamService";
import { moduleLoader as teamMembershipRepositoryModuleLoader } from "./TeamMembershipRepository.module";
import { moduleLoader as teamRepositoryModuleLoader } from "./TeamRepository.module";
import { TEAMS_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = TEAMS_DI_TOKENS.TEAM_SERVICE;
const moduleToken = TEAMS_DI_TOKENS.TEAM_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: TeamService,
  depsMap: {
    teamRepository: teamRepositoryModuleLoader,
    teamMembershipRepository: teamMembershipRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { TeamService };
