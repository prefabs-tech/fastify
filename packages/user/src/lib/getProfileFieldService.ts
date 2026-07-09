import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { Database } from "@prefabs.tech/fastify-slonik";

import ProfileFieldService from "../model/profileFields/service";

const getProfileFieldService = (
  config: ApiConfig,
  slonik: Database,
  dbSchema?: string,
) => {
  const Service = config.user.services?.userProfileField || ProfileFieldService;

  return new Service(config, slonik, dbSchema);
};

export default getProfileFieldService;
