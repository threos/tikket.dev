import { createContainer } from "@calcom/features/di/di";
import {
  type PublicTeamService,
  moduleLoader as publicTeamServiceModuleLoader,
} from "./PublicTeamService.module";

const publicTeamServiceContainer = createContainer();

export function getPublicTeamService(): PublicTeamService {
  publicTeamServiceModuleLoader.loadModule(publicTeamServiceContainer);
  return publicTeamServiceContainer.get<PublicTeamService>(publicTeamServiceModuleLoader.token);
}
