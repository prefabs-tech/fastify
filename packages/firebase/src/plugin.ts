import type { FastifyInstance } from "fastify";

import FastifyPlugin from "fastify-plugin";

import { initializeFirebase } from "./lib/index.js";
import runMigrations from "./migrations/runMigrations.js";
import notificationRoutes from "./model/notification/controller.js";
import userDevicesRoutes from "./model/userDevice/controller.js";

const plugin = async (fastify: FastifyInstance) => {
  const { config, log, slonik } = fastify;

  if (config.firebase.enabled === false) {
    log.info("fastify-firebase plugin is not enabled");
  } else {
    log.info("Registering fastify-firebase plugin");

    await runMigrations(slonik, config);

    initializeFirebase(config, fastify);
  }

  const { routePrefix, routes } = config.firebase;

  if (!routes?.notifications?.disabled) {
    await fastify.register(notificationRoutes, { prefix: routePrefix });
  }

  if (!routes?.userDevices?.disabled) {
    await fastify.register(userDevicesRoutes, { prefix: routePrefix });
  }
};

export default FastifyPlugin(plugin);
