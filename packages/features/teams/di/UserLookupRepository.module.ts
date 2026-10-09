import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { UserLookupRepository } from "@calcom/features/teams/repositories/UserLookupRepository";
import { TEAMS_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = TEAMS_DI_TOKENS.USER_LOOKUP_REPOSITORY;
const moduleToken = TEAMS_DI_TOKENS.USER_LOOKUP_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: UserLookupRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { UserLookupRepository };
