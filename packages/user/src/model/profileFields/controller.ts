import { FastifyInstance } from "fastify";

import { ROUTE_USER_PROFILE_FIELDS } from "../../constants";
import handlers from "./handlers";
import { getProfileFieldsListSchema } from "./schema";

const plugin = async (fastify: FastifyInstance) => {
  fastify.get(
    ROUTE_USER_PROFILE_FIELDS,
    {
      preHandler: [fastify.verifySession()],
      schema: getProfileFieldsListSchema,
    },
    handlers.getProfileFields,
  );
};

export default plugin;
