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
      preHandler: [fastify.verifySession()],
      schema: getProfileFieldsListSchema,
    },
    handlers.getProfileFields,
  );

  fastify.patch(
    ROUTE_USER_PROFILE,
    {
      preHandler: [fastify.verifySession()],
      schema: updateUserProfileSchema,
    },
    handlers.updateUserProfile,
  );
};

export default plugin;
