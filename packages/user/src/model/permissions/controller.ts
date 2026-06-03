import type { FastifyInstance } from "fastify";

import { ROUTE_PERMISSIONS } from "../../constants";
import handlers from "./handlers";
import { getPermissionsSchema } from "./schema";

const plugin = async (fastify: FastifyInstance) => {
  fastify.get(
    ROUTE_PERMISSIONS,
    {
      preHandler: [fastify.verifySession()],
      schema: getPermissionsSchema,
    },
    handlers.getPermissions,
  );
};

export default plugin;
