import type { FastifyInstance } from "fastify";

import FastifyPlugin from "fastify-plugin";

import authPlugin from "./authPlugin";
import hasPermissionPlugin from "./hasPermissionPlugin";

const plugin = FastifyPlugin(async (fastify: FastifyInstance) => {
  if (fastify.config.graphql?.enabled) {
    await fastify.register(hasPermissionPlugin);
    await fastify.register(authPlugin);
  }
});

export default plugin;
