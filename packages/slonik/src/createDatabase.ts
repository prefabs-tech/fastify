import type { ClientConfiguration, DatabasePool } from "slonik";

import { createPool } from "slonik";

import type { Database } from "./types/index.js";

import createClientConfig from "./factories/createClientConfig.js";

const createDatabase = async (
  connectionString: string,
  clientConfig?: Partial<ClientConfiguration>,
): Promise<Database> => {
  const pool: DatabasePool = await createPool(
    connectionString,
    createClientConfig(clientConfig),
  );

  const database: Database = {
    connect: pool.connect.bind(pool),
    pool,
    query: pool.query.bind(pool),
  };

  return database;
};

export default createDatabase;
