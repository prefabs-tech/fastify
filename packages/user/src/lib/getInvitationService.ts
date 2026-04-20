import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { Database } from "@prefabs.tech/fastify-slonik";

import InvitationService from "../model/invitations/service";

const getInvitationService = (
  config: ApiConfig,
  slonik: Database,
  dbSchema?: string,
) => {
  const Service = config.user.services?.invitation || InvitationService;

  return new Service(config, slonik, dbSchema);
};

export default getInvitationService;
