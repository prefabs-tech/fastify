import type { FastifyInstance } from "fastify";

import FastifyPlugin from "fastify-plugin";
import { mercurius } from "mercurius";

import type { GraphqlOptions } from "./types";

import buildContext from "./buildContext";

const plugin = async (fastify: FastifyInstance, options: GraphqlOptions) => {
  fastify.log.info("Registering fastify-graphql plugin");

  if (Object.keys(options).length === 0) {
    fastify.log.warn(
      "The graphql plugin now recommends passing graphql options directly to the plugin.",
    );

    if (!fastify.config.graphql) {
      throw new Error(
        "Missing graphql configuration. Did you forget to pass it to the graphql plugin?",
      );
    }

    options = fastify.config.graphql;
  }

  if (options?.enabled) {
    // Register graphql
    await fastify.register(mercurius, {
      context: buildContext(options.plugins),
      ...options,
    });
  } else {
    fastify.log.info("GraphQL API not enabled");
  }
};

export default FastifyPlugin(plugin);
