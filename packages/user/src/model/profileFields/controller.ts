import { FastifyInstance } from "fastify";

import {
  ROUTE_USER_PROFILE,
  ROUTE_USER_PROFILE_FIELDS,
} from "../../constants.js";
import handlers from "./handlers/index.js";
import {
  getProfileFieldsListSchema,
  updateUserProfileSchema,
} from "./schema.js";

const plugin = async (fastify: FastifyInstance) => {
  fastify.get(
    ROUTE_USER_PROFILE_FIELDS,
    {
      config: { permissionMiddleware: false },
      preHandler: [fastify.verifySession()],
      schema: getProfileFieldsListSchema,
    },
    handlers.getProfileFields,
  );

  fastify.patch(
    ROUTE_USER_PROFILE,
    {
      config: { permissionMiddleware: false },
      preHandler: [fastify.verifySession()],
      schema: updateUserProfileSchema,
    },
    handlers.updateUserProfile,
  );
};

export default plugin;
