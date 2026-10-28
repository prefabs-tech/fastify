import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { errorHandler as supertokensErrorHandler } from "supertokens-node/framework/fastify/index.js";

export const errorHandler = (
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  return (
    supertokensErrorHandler() as unknown as (
      this: FastifyInstance,
      error: unknown,
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>
  ).call(request.server, error, request, reply);
};
