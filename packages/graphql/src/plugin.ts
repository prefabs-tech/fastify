import type { FastifyInstance } from "fastify";

import FastifyPlugin from "fastify-plugin";
import { mercurius } from "mercurius";

import type { GraphqlOptions } from "./types";

import buildContext from "./buildContext";
import { UPLOAD_TRANSPORT_PLUGIN_NAME } from "./constants";
import graphqlUploadTransport from "./uploads/transport";

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
    // Register the upload transport before mercurius so its catch-all
    // content-type parser is snapshotted into the mercurius context
    if (
      options.uploads?.enabled !== false &&
      !fastify.hasPlugin(UPLOAD_TRANSPORT_PLUGIN_NAME)
    ) {
      await fastify.register(graphqlUploadTransport, {
        path: options.path,
        ...options.uploads,
      });
    }

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
