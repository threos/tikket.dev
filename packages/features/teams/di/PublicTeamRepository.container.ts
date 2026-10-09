import { createContainer } from "@calcom/features/di/di";
import {
  type PublicTeamRepository,
  moduleLoader as publicTeamRepositoryModuleLoader,
} from "./PublicTeamRepository.module";

const publicTeamRepositoryContainer = createContainer();

export function getPublicTeamRepository(): PublicTeamRepository {
  publicTeamRepositoryModuleLoader.loadModule(publicTeamRepositoryContainer);
  return publicTeamRepositoryContainer.get<PublicTeamRepository>(publicTeamRepositoryModuleLoader.token);
}
