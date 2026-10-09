import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { TeamMembershipRepository } from "@calcom/features/teams/repositories/TeamMembershipRepository";
import { TEAMS_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = TEAMS_DI_TOKENS.TEAM_MEMBERSHIP_REPOSITORY;
const moduleToken = TEAMS_DI_TOKENS.TEAM_MEMBERSHIP_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: TeamMembershipRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { TeamMembershipRepository };
