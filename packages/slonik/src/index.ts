import type { ConnectionRoutine, DatabasePool, QueryFunction } from "slonik";

import { sql } from "slonik";

import type { SlonikConfig } from "./types/index.js";

declare module "fastify" {
  interface FastifyInstance {
    slonik: {
      connect: <T>(connectionRoutine: ConnectionRoutine<T>) => Promise<T>;
      pool: DatabasePool;
      query: QueryFunction;
    };
    sql: typeof sql;
  }

  interface FastifyRequest {
    dbSchema: string;
    slonik: {
      connect: <T>(connectionRoutine: ConnectionRoutine<T>) => Promise<T>;
      pool: DatabasePool;
      query: QueryFunction;
    };
    sql: typeof sql;
  }
}

declare module "@prefabs.tech/fastify-config" {
  interface ApiConfig {
    slonik: SlonikConfig;
  }
}

export { default as createDatabase } from "./createDatabase.js";

export * from "./filters.js";
export { default as formatDate } from "./formatDate.js";

export { default as migrationPlugin } from "./migrationPlugin.js";
export { default } from "./plugin.js";
export { default as BaseService } from "./service.js";
export * from "./sql.js";
export { default as DefaultSqlFactory } from "./sqlFactory.js";
export { createBigintTypeParser } from "./typeParsers/createBigintTypeParser.js";

export type * from "./types/index.js";
