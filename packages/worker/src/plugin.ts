import { FastifyInstance } from "fastify";
import FastifyPlugin from "fastify-plugin";

import {
  initializeCronJobs,
  initializeQueueProcessors,
} from "./lib/initialize";

const plugin = async (fastify: FastifyInstance) => {
  const { config, log } = fastify;

  if (!config.worker) {
    log.warn("Worker configuration is missing. Skipping plugin registration");

    return;
  }

  log.info("Registering worker plugin");

  initializeCronJobs(config.worker.cronJobs);
  initializeQueueProcessors(config.worker.queues);
};

export default FastifyPlugin(plugin);
