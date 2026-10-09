import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { VerificationTokenRepository } from "@calcom/features/teams/repositories/VerificationTokenRepository";
import { TEAMS_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = TEAMS_DI_TOKENS.VERIFICATION_TOKEN_REPOSITORY;
const moduleToken = TEAMS_DI_TOKENS.VERIFICATION_TOKEN_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: VerificationTokenRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { VerificationTokenRepository };
