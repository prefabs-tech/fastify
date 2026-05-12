import type { FastifyInstance } from "fastify";

import FastifyPlugin from "fastify-plugin";
import { stringifyDsn } from "slonik";

import type { SlonikOptions } from "./types";

import createClientConfiguration from "./factories/createClientConfiguration";
import runMigrations from "./migrations/runMigrations";
import { fastifySlonik } from "./slonik";

const plugin = async (fastify: FastifyInstance, options: SlonikOptions) => {
  fastify.log.info("Registering fastify-slonik plugin");

  if (Object.keys(options).length === 0) {
    fastify.log.warn(
      "The slonik plugin now recommends passing slonik options directly to the plugin.",
    );

    if (!fastify.config?.slonik) {
      throw new Error(
        "Missing slonik configuration. Did you forget to pass it to the slonik plugin?",
      );
    }

    options = fastify.config.slonik;
  }

  await fastify.register(fastifySlonik, {
    clientConfiguration: createClientConfiguration(
      options.clientConfiguration,
      options.queryLogging?.enabled,
    ),
    connectionString: stringifyDsn(options.db),
  });

  await runMigrations(fastify.slonik, options);

  fastify.decorateRequest("dbSchema", "");
};

export default FastifyPlugin(plugin);
