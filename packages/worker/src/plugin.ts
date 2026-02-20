import { FastifyInstance } from "fastify";
import FastifyPlugin from "fastify-plugin";

import Worker from "./worker";

const plugin = async (fastify: FastifyInstance) => {
  const { config, log } = fastify;

  if (!config.worker) {
    log.warn("Worker configuration is missing. Skipping plugin registration");

    return;
  }

  log.info("Registering worker plugin");

  const worker = new Worker(config.worker);

  await worker.start();

  fastify.decorate("worker", worker);

  fastify.addHook("onClose", async () => {
    log.info("Shutting down worker");
    await worker.shutdown();
  });
};

export default FastifyPlugin(plugin);
