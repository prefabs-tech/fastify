import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";

import setupCronJobs from "./cron/setup";

const plugin = async (fastify: FastifyInstance) => {
  const { config, log } = fastify;

  if (!config.worker) {
    log.warn("Worker configuration is missing. Skipping plugin registration");

    return;
  }

  log.info("Registering worker plugin");

  if (config.worker.cronJobs) {
    setupCronJobs(config.worker);
  }
};

export default fastifyPlugin(plugin);
