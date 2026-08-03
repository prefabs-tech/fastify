import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { Database } from "@prefabs.tech/fastify-slonik";

import { addPhoneNumberInUsersTableQuery } from "./queries";

const runMigrations = async (config: ApiConfig, database: Database) => {
  await database.connect(async (connection) => {
    await connection.query(addPhoneNumberInUsersTableQuery(config));
  });
};

export default runMigrations;
