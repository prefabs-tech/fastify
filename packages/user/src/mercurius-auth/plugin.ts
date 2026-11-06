import type { FastifyInstance } from "fastify";

import FastifyPlugin from "fastify-plugin";

import authPlugin from "./authPlugin.js";
import hasPermissionPlugin from "./hasPermissionPlugin.js";

const plugin = FastifyPlugin(async (fastify: FastifyInstance) => {
  if (!fastify.config.graphql?.enabled) {
    return;
  }

  await fastify.register(hasPermissionPlugin);
  await fastify.register(authPlugin);
});

export default plugin;
