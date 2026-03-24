import { migrate as runMigrations } from "@prefabs.tech/postgres-migrations";
import * as pg from "pg";

import type { SlonikOptions } from "./types";
import type { ClientConfig } from "pg";

const migrate = async (slonikOptions: SlonikOptions) => {
  const defaultMigrationsPath = "migrations";

  let clientConfig: ClientConfig = {
    database: slonikOptions.db.databaseName,
    host: slonikOptions.db.host,
    options: slonikOptions.db.options,
    password: slonikOptions.db.password,
    port: slonikOptions.db.port,
    user: slonikOptions.db.username,
  };

  if (slonikOptions.clientConfiguration?.ssl) {
    clientConfig = {
      ...clientConfig,
      ssl: slonikOptions.clientConfiguration?.ssl,
    };
  }

  const client = new pg.Client(clientConfig);

  await client.connect();

  await runMigrations(
    { client: client },
    slonikOptions?.migrations?.path || defaultMigrationsPath,
  );

  await client.end();
};

export default migrate;
