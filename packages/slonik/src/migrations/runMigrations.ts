import queryToCreateExtension from "./queryToCreateExtensions";

import type { Database, SlonikOptions } from "../types";

// FIXME: This should be defined in the constants file
// but it is not available in the current context
const extensions = ["citext", "unaccent"];

const runMigrations = async (database: Database, options: SlonikOptions) => {
  extensions.push(...(options.extensions || []));

  await database.connect(async (connection) => {
    for (const extension of extensions) {
      await connection.query(queryToCreateExtension(extension));
    }
  });
};

export default runMigrations;
