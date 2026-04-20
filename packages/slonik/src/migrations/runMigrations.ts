import type { Database, SlonikOptions } from "../types";

import { EXTENSIONS } from "../constants";
import queryToCreateExtension from "./queryToCreateExtensions";

const runMigrations = async (database: Database, options: SlonikOptions) => {
  const extensions = [
    ...new Set([...EXTENSIONS, ...(options.extensions || [])]),
  ];

  await database.connect(async (connection) => {
    for (const extension of extensions) {
      await connection.query(queryToCreateExtension(extension));
    }
  });
};

export default runMigrations;
