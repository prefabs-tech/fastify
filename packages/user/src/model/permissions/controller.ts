import type { FastifyInstance } from "fastify";

import { ROUTE_PERMISSIONS } from "../../constants.js";
import handlers from "./handlers/index.js";
import { getPermissionsSchema } from "./schema.js";

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
