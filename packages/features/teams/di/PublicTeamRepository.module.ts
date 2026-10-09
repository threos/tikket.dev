import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { PublicTeamRepository } from "@calcom/features/teams/repositories/PublicTeamRepository";
import { PUBLIC_TEAM_DI_TOKENS } from "./publicTokens";

const thisModule = createModule();
const token = PUBLIC_TEAM_DI_TOKENS.PUBLIC_TEAM_REPOSITORY;
const moduleToken = PUBLIC_TEAM_DI_TOKENS.PUBLIC_TEAM_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: PublicTeamRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { PublicTeamRepository };
