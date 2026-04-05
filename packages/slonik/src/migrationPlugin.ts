import type { FastifyInstance } from "fastify";

import FastifyPlugin from "fastify-plugin";

import type { SlonikOptions } from "./types";

import migrate from "./migrate";

const plugin = async (fastify: FastifyInstance, options: SlonikOptions) => {
  fastify.log.info("Running database migrations");

  if (Object.keys(options).length === 0) {
    fastify.log.warn(
      "The migration plugin now recommends passing migration options directly to the plugin.",
    );

    if (!fastify.config?.slonik) {
      throw new Error(
        "Missing migration configuration. Did you forget to pass it to the migration plugin?",
      );
    }

    options = fastify.config.slonik;
  }

  await migrate(options);
};

export default FastifyPlugin(plugin);
