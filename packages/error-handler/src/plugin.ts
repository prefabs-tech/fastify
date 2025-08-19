import fastifySensible from "@fastify/sensible";
import FastifyPlugin from "fastify-plugin";

import { errorHandler } from "./errorHandler";
import { errorSchema } from "./utils/errorSchema";

import type { ErrorHandlerOptions } from "./types";
import type { FastifyInstance } from "fastify";

const plugin = async (
  fastify: FastifyInstance,
  options: ErrorHandlerOptions,
) => {
  fastify.log.info("Registering fastify-error-handler plugin");

  fastify.decorate("stackTrace", options.stackTrace || false);

  await fastify.register(fastifySensible);

  fastify.setErrorHandler(async (error, request, reply) => {
    if (options.preErrorHandler) {
      try {
        await options.preErrorHandler(error, request, reply);
      } catch {
        // If preErrorHandler throws an error, we can ignore it and continue
      }

      if (reply.sent) {
        return;
      }
    }

    return errorHandler(error, request, reply);
  });

  fastify.addSchema(errorSchema);
};

export default FastifyPlugin(plugin);
