import type { ConnectionRoutine, DatabasePool, QueryFunction } from "slonik";

import { sql } from "slonik";

import type { SlonikConfig } from "./types";

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

export { default as createDatabase } from "./createDatabase";

export * from "./filters";
export { default as formatDate } from "./formatDate";

export { default as migrationPlugin } from "./migrationPlugin";
export { default } from "./plugin";
export { default as BaseService } from "./service";
export * from "./sql";
export { default as DefaultSqlFactory } from "./sqlFactory";
export { createBigintTypeParser } from "./typeParsers/createBigintTypeParser";

export type * from "./types";
