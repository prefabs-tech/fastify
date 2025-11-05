import { sql } from "slonik";

import type { QuerySqlToken } from "slonik";
import type { ZodTypeAny } from "zod";

const queryToCreateExtension = (
  extension: string,
): QuerySqlToken<ZodTypeAny> => {
  return sql.unsafe`
    CREATE EXTENSION IF NOT EXISTS ${sql.identifier([extension])};
  `;
};

export default queryToCreateExtension;
