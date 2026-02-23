import { FastifyInstance } from "fastify";
import FastifyPlugin from "fastify-plugin";

import JobOrchestrator from "./jobOrchestrator";

const plugin = async (fastify: FastifyInstance) => {
  const { config, log } = fastify;

  if (!config.worker) {
    log.warn("Worker configuration is missing. Skipping plugin registration");

    return;
  }

  log.info("Registering worker plugin");

  const jobOrchestrator = new JobOrchestrator(config.worker);

  await jobOrchestrator.start();

  fastify.decorate("worker", jobOrchestrator);

  fastify.addHook("onClose", async () => {
    log.info("Shutting down worker");
    await jobOrchestrator.shutdown();
  });
};

export default FastifyPlugin(plugin);
