import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { Database } from "@prefabs.tech/fastify-slonik";

import { createFeedbacksTableQuery } from "./queries";

const runMigrations = async (database: Database, config: ApiConfig) => {
  await database.connect(async (connection) => {
    await connection.query(createFeedbacksTableQuery(config));
  });
};

export default runMigrations;
