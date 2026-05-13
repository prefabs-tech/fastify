import type { IMemoryDb, SlonikAdapterOptions } from "pg-mem";
import type { Interceptor, QueryResultRow } from "slonik";

/* istanbul ignore file */
import { newDb } from "pg-mem";

// Converts snake_case keys to camelCase — mirrors fieldNameCaseConverter from @prefabs.tech/fastify-slonik
const snakeToCamel = (s: string) =>
  s.replaceAll(/_([a-z])/g, (_, c: string) => c.toUpperCase());

const camelizeRow = (row: QueryResultRow): QueryResultRow => {
  const result: QueryResultRow = {};
  for (const [key, value] of Object.entries(row)) {
    result[snakeToCamel(key)] = value;
  }
  return result;
};

const fieldNameCaseConverter: Interceptor = {
  transformRow: (_queryContext, _query, row): QueryResultRow =>
    camelizeRow(row),
};

interface Options {
  db?: IMemoryDb;
  slonikAdapterOptions?: SlonikAdapterOptions;
}

const createDatabase = async (options?: Options) => {
  const db = options?.db ?? newDb();

  const defaultOptions: SlonikAdapterOptions = {
    createPoolOptions: {
      interceptors: [fieldNameCaseConverter],
    },
  };

  const mergedOptions: SlonikAdapterOptions = {
    ...defaultOptions,
    ...options?.slonikAdapterOptions,
    createPoolOptions: {
      ...defaultOptions.createPoolOptions,
      ...options?.slonikAdapterOptions?.createPoolOptions,
    },
  };

  const pool = await db.adapters.createSlonik(mergedOptions);

  return {
    connect: pool.connect.bind(pool),
    pool,
    query: pool.query.bind(pool),
  };
};

export default createDatabase;
