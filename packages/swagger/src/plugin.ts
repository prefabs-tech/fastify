import type { FastifyInstance } from "fastify";

import fastifySwagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import FastifyPlugin from "fastify-plugin";

import type { SwaggerOptions } from "./types";

const plugin = async (fastify: FastifyInstance, options: SwaggerOptions) => {
  const { fastifySwaggerOptions, uiOptions } = options;

  if (options.enabled === false) {
    fastify.log.info("Swagger plugin is not enabled");

    return;
  }

  await fastify.register(fastifySwagger, fastifySwaggerOptions);

  await fastify.register(swaggerUi, uiOptions ?? {});

  fastify.decorate(
    "swaggerUIRoutePrefix",
    uiOptions?.routePrefix ?? "/documentation",
  );

  fastify.decorate(
    "apiDocumentationPath",
    uiOptions?.routePrefix ?? "/documentation",
  );
};

export default FastifyPlugin(plugin);
