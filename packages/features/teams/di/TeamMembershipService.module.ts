import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { TeamMembershipService } from "@calcom/features/teams/services/TeamMembershipService";
import { moduleLoader as teamMembershipRepositoryModuleLoader } from "./TeamMembershipRepository.module";
import { moduleLoader as teamRepositoryModuleLoader } from "./TeamRepository.module";
import { TEAMS_DI_TOKENS } from "./tokens";
import { moduleLoader as userLookupRepositoryModuleLoader } from "./UserLookupRepository.module";
import { moduleLoader as verificationTokenRepositoryModuleLoader } from "./VerificationTokenRepository.module";

const thisModule = createModule();
const token = TEAMS_DI_TOKENS.TEAM_MEMBERSHIP_SERVICE;
const moduleToken = TEAMS_DI_TOKENS.TEAM_MEMBERSHIP_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: TeamMembershipService,
  depsMap: {
    teamRepository: teamRepositoryModuleLoader,
    teamMembershipRepository: teamMembershipRepositoryModuleLoader,
    userLookupRepository: userLookupRepositoryModuleLoader,
    verificationTokenRepository: verificationTokenRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { TeamMembershipService };
