import type { QuerySqlToken } from "slonik";
import type { ZodTypeAny } from "zod";

import { sql } from "slonik";

import migrationSql from "./supertokens-core-v6.sql?raw";

/**
 * Split the embedded SuperTokens core v6 dump into statements.
 * Assumes statement-oriented SQL only: line `--` comments, no `;` inside
 * string literals or PL/pgSQL bodies. Valid only for this dump.
 */
const splitSupertokensCoreV6Statements = (sqlText: string): string[] => {
  const withoutComments = sqlText.replaceAll(/^\s*--.*$/gm, "");
  const withoutNestedTransactions = withoutComments
    .replaceAll(/^\s*BEGIN;\s*$/gm, "")
    .replaceAll(/^\s*COMMIT;\s*$/gm, "");

  return withoutNestedTransactions
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
};

const supertokensCoreV6Queries = (): Array<QuerySqlToken<ZodTypeAny>> =>
  splitSupertokensCoreV6Statements(migrationSql).map(
    (statement) => sql.unsafe`${statement};`,
  );

export { splitSupertokensCoreV6Statements, supertokensCoreV6Queries };
