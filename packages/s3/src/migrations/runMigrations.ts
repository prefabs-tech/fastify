import { createFilesTableQuery } from "./queries";

import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { Database } from "@prefabs.tech/fastify-slonik";

const runMigrations = async (database: Database, config: ApiConfig) => {
  await database.connect(async (connection) => {
    await connection.query(createFilesTableQuery(config));
  });
};

export default runMigrations;
