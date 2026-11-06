import type { Database, SlonikOptions } from "../types/index.js";

import { EXTENSIONS } from "../constants.js";
import queryToCreateExtension from "./queryToCreateExtensions.js";

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
