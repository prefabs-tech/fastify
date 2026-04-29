import type { FastifyInstance } from "fastify";

import fastifySensible from "@fastify/sensible";
import FastifyPlugin from "fastify-plugin";

import type { ErrorHandlerOptions } from "./types";

import { errorHandler } from "./errorHandler";
import { errorSchema } from "./utils/errorSchema";

const DOMAIN_STATUS_MIN = 100;
const DOMAIN_STATUS_MAX = 599;

function assertDomainErrorStatusMap(
  map: Readonly<Record<string, number>> | undefined,
): void {
  if (map === undefined) {
    return;
  }
  for (const [errorName, statusCode] of Object.entries(map)) {
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
  }
}

const plugin = async (
  fastify: FastifyInstance,
  options: ErrorHandlerOptions,
) => {
  fastify.log.info("Registering fastify-error-handler plugin");

  fastify.decorate("stackTrace", options.stackTrace || false);

  assertDomainErrorStatusMap(options.domainErrorStatusMap);

  const domainErrorStatusMap = new Map<string, number>(
    Object.entries(options.domainErrorStatusMap ?? {}),
  );

  fastify.decorate("domainErrorStatusMap", domainErrorStatusMap);

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
