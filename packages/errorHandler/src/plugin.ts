import fastifySensible from "@fastify/sensible";
import FastifyPlugin from "fastify-plugin";

import { errorHandler } from "./errorHandler";

import type { FastifyInstance } from "fastify";

const plugin = async (fastify: FastifyInstance) => {
  fastify.log.info("Registering fastify-error-handler plugin");

  // const { config} = fastify;

  await fastify.register(fastifySensible);

  await fastify.setErrorHandler(errorHandler);
};

export default FastifyPlugin(plugin);
