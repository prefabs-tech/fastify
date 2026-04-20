import type { QuerySqlToken } from "slonik";
import type { ZodTypeAny } from "zod";

import { sql } from "slonik";

const queryToCreateExtension = (
  extension: string,
): QuerySqlToken<ZodTypeAny> => {
  return sql.unsafe`
    CREATE EXTENSION IF NOT EXISTS ${sql.identifier([extension])};
  `;
};

export default queryToCreateExtension;
