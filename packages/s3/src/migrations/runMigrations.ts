import type { Database } from "@prefabs.tech/fastify-slonik";

import type { S3Options } from "../types";

import { createFilesTableQuery } from "./queries";

const runMigrations = async (
  database: Database,
  options: Partial<S3Options>,
) => {
  await database.connect(async (connection) => {
    await connection.query(createFilesTableQuery(options));
  });
};

export default runMigrations;
