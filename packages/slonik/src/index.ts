import { sql } from "slonik";

import type { SlonikConfig } from "./types";
import type { ConnectionRoutine, DatabasePool, QueryFunction } from "slonik";

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

export { default } from "./plugin";

export * from "./filters";
export * from "./sql";

export { createBigintTypeParser } from "./typeParsers/createBigintTypeParser";
export { default as createDatabase } from "./createDatabase";
export { default as BaseService } from "./service";
export { default as DefaultSqlFactory } from "./sqlFactory";
export { default as formatDate } from "./formatDate";
export { default as migrationPlugin } from "./migrationPlugin";

export type * from "./types";
