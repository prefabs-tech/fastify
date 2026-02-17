import { FastifyInstance } from "fastify";
import FastifyPlugin from "fastify-plugin";

import setupCronJobs from "./cron/setup";
import setupQueues from "./queue/setup";

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

  if (config.worker.queues) {
    setupQueues(config.worker);
  }
};

export default FastifyPlugin(plugin);
