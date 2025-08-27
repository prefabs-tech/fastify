import { migrate as runMigrations } from "@prefabs.tech/postgres-migrations";
import * as pg from "pg";

import type { SlonikOptions } from "./types";
import type { ClientConfig } from "pg";

const migrate = async (slonikOptions: SlonikOptions) => {
  const defaultMigrationsPath = "migrations";

  let clientConfig: ClientConfig = {
    database: slonikOptions.db.databaseName,
    user: slonikOptions.db.username,
    password: slonikOptions.db.password,
    host: slonikOptions.db.host,
    port: slonikOptions.db.port,
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
