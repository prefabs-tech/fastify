import type { FastifyInstance } from "fastify";

import FastifyPlugin from "fastify-plugin";

import runMigrations from "./migrations/runMigrations";
import feedbackRoutes from "./model/feedback/controller";

const plugin = async (fastify: FastifyInstance) => {
  const { config, log, slonik } = fastify;

  if (config.feedback.enabled === false) {
    log.info("fastify-feedback plugin is not enabled");
  } else {
    log.info("Registering fastify-feedback plugin");

    await runMigrations(slonik, config);
  }

  const { routePrefix, routes } = config.feedback;

  if (!routes?.feedbacks?.disabled) {
    await fastify.register(feedbackRoutes, { prefix: routePrefix });
  }
};

export default FastifyPlugin(plugin);
