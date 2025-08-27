import UserService from "../model/users/service";

import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { Database } from "@prefabs.tech/fastify-slonik";

const getUserService = (
  config: ApiConfig,
  slonik: Database,
  dbSchema?: string,
) => {
  const Service = config.user.services?.user || UserService;

  return new Service(config, slonik, dbSchema);
};

export default getUserService;
