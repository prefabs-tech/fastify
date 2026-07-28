import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { Database } from "@prefabs.tech/fastify-slonik";

import {
  addPhoneNumberInUsersTableQuery,
  addProfileInUsersTableQuery,
  createInvitationsTableQuery,
  createProfileFieldsTablesQueries,
  createUsersTableQuery,
} from "./queries";

const runMigrations = async (config: ApiConfig, database: Database) => {
  await database.connect(async (connection) => {
    await connection.transaction(async (transactionConnection) => {
      await transactionConnection.query(createUsersTableQuery(config));
      await transactionConnection.query(
        addPhoneNumberInUsersTableQuery(config),
      );
      await transactionConnection.query(createInvitationsTableQuery(config));

      if (config.user.features?.profileFields?.enabled) {
        await transactionConnection.query(addProfileInUsersTableQuery(config));

        for (const query of createProfileFieldsTablesQueries(config)) {
          await transactionConnection.query(query);
        }
      }
    });
  });
};

export default runMigrations;
