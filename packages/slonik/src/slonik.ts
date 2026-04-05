import type { FastifyInstance } from "fastify";
import type { ClientConfigurationInput } from "slonik";

// [OP 2023-JAN-28] Copy/pasted from https://github.com/spa5k/fastify-slonik/blob/main/src/index.ts
import fastifyPlugin from "fastify-plugin";
import { sql } from "slonik";

import type { Database } from "./types";

import createDatabase from "./createDatabase";

type SlonikOptions = {
  clientConfiguration?: ClientConfigurationInput;
  connectionString: string;
};

const plugin = async (fastify: FastifyInstance, options: SlonikOptions) => {
  const { clientConfiguration, connectionString } = options;
  let db: Database;

  try {
    db = await createDatabase(connectionString, clientConfiguration);

    await db.pool.connect(async () => {
      fastify.log.info("✅ Connected to Postgres DB");
    });
  } catch (error) {
    fastify.log.error("🔴 Error happened while connecting to Postgres DB");
    throw new Error(error as string);
  }

  if (!fastify.hasDecorator("slonik") && !fastify.hasDecorator("sql")) {
    fastify.decorate("slonik", db);
    fastify.decorate("sql", sql);
  }

  if (
    !fastify.hasRequestDecorator("slonik") &&
    !fastify.hasRequestDecorator("sql")
  ) {
    fastify.decorateRequest("slonik");
    fastify.decorateRequest("sql");

    fastify.addHook("onRequest", async (req) => {
      req.slonik = db;
      req.sql = sql;
    });
  }
};

export const fastifySlonik = fastifyPlugin(plugin, {
  fastify: "5.x",
  name: "fastify-slonik",
});

export default fastifyPlugin(plugin, {
  fastify: "5.x",
  name: "fastify-slonik",
});
