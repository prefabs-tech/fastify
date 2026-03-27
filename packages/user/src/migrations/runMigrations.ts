import {
  addBetterAuthColumnsQuery,
  createInvitationsTableQuery,
  createUsersTableQuery,
} from "./queries";

import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { Database } from "@prefabs.tech/fastify-slonik";

const runMigrations = async (config: ApiConfig, database: Database) => {
  await database.connect(async (connection) => {
    await connection.transaction(async (transactionConnection) => {
      await transactionConnection.query(createUsersTableQuery(config));
      await transactionConnection.query(createInvitationsTableQuery(config));
      // Add BetterAuth-required columns to users table (may return array of queries)
      const betterAuthQueries = addBetterAuthColumnsQuery(config);
      for (const query of betterAuthQueries) {
        await transactionConnection.query(query);
      }
    });
  });
};

export default runMigrations;
