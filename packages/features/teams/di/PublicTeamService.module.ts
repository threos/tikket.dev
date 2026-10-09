import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { PublicTeamService } from "@calcom/features/teams/services/PublicTeamService";
import { moduleLoader as publicTeamRepositoryModuleLoader } from "./PublicTeamRepository.module";
import { PUBLIC_TEAM_DI_TOKENS } from "./publicTokens";

const thisModule = createModule();
const token = PUBLIC_TEAM_DI_TOKENS.PUBLIC_TEAM_SERVICE;
const moduleToken = PUBLIC_TEAM_DI_TOKENS.PUBLIC_TEAM_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: PublicTeamService,
  depsMap: {
    publicTeamRepository: publicTeamRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { PublicTeamService };
