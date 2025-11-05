import queryToCreateExtension from "./queryToCreateExtensions";
import { EXTENSIONS } from "../constants";

import type { Database, SlonikOptions } from "../types";

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
