import type { FastifyInstance } from "fastify";

import fastifySensible from "@fastify/sensible";
import FastifyPlugin from "fastify-plugin";

import type { ErrorHandlerOptions } from "./types";

import { errorHandler } from "./errorHandler";
import { errorSchema } from "./utils/errorSchema";

const DOMAIN_STATUS_MIN = 400;
const DOMAIN_STATUS_MAX = 599;

function buildDomainErrorStatusMap(
  map: ReadonlyMap<string, number> | undefined,
): Map<string, number> {
  const result = new Map<string, number>();

  if (map === undefined) {
    return result;
  }

  for (const [errorName, statusCode] of map.entries()) {
    if (
      typeof statusCode !== "number" ||
      !Number.isInteger(statusCode) ||
      statusCode < DOMAIN_STATUS_MIN ||
      statusCode > DOMAIN_STATUS_MAX
    ) {
      throw new Error(
        `domainErrorStatusMap: invalid HTTP status for "${errorName}": ${String(statusCode)} (expected integer ${DOMAIN_STATUS_MIN}-${DOMAIN_STATUS_MAX})`,
      );
    }

    result.set(errorName, statusCode);
  }

  return result;
}

const plugin = async (
  fastify: FastifyInstance,
  options: ErrorHandlerOptions,
) => {
  fastify.log.info("Registering fastify-error-handler plugin");
  options.stackTrace = options.stackTrace || false;
  options.domainErrorStatusMap = buildDomainErrorStatusMap(
    options.domainErrorStatusMap,
  );

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

    return errorHandler(error, request, reply, options);
  });

  fastify.addSchema(errorSchema);
};

export default FastifyPlugin(plugin);
