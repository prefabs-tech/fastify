import type { FastifyInstance } from "fastify";

import { ROUTE_FEEDBACK } from "../../constants";
import handlers from "./handlers";
import { postFeedbackSchema } from "./schema";

const plugin = async (fastify: FastifyInstance) => {
  const handlersConfig = fastify.config.feedback.handlers?.feedback;

  fastify.post(
    ROUTE_FEEDBACK,
    {
      preHandler: [fastify.verifySession()],
      schema: postFeedbackSchema,
    },
    handlersConfig?.createFeedback || handlers.createFeedback,
  );
};

export default plugin;
