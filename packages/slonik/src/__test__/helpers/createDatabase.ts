/* istanbul ignore file */
import { newDb } from "pg-mem";

import fieldNameCaseConverter from "../../interceptors/fieldNameCaseConverter";

import type { SlonikAdapterOptions, IMemoryDb } from "pg-mem";

interface IOptions {
  db?: IMemoryDb;
  slonikAdapterOptions?: SlonikAdapterOptions;
}

const createDatabase = async (options?: IOptions) => {
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
