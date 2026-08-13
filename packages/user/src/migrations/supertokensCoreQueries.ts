import type { QuerySqlToken } from "slonik";
import type { ZodTypeAny } from "zod";

import { sql } from "slonik";

import migrationSqlV6 from "./supertokens-core-v6.sql?raw";
import migrationSqlV7 from "./supertokens-core-v7.sql?raw";
import migrationSqlV9 from "./supertokens-core-v9.sql?raw";
import { applyTableNamesPrefix } from "./supertokensCoreSql";

const splitSqlStatements = (sqlText: string): string[] => {
  const withoutComments = sqlText.replaceAll(/^\s*--.*$/gm, "");
  const withoutNestedTransactions = withoutComments
    .replaceAll(/^\s*BEGIN;\s*$/gm, "")
    .replaceAll(/^\s*COMMIT;\s*$/gm, "");

  return withoutNestedTransactions
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
};

const toUnsafeQuery = (statement: string): QuerySqlToken<ZodTypeAny> => {
  const sqlText = `${statement};`;
  const parts = Object.freeze(
    Object.assign([sqlText], { raw: Object.freeze([sqlText]) }),
  ) as unknown as TemplateStringsArray;

  return sql.unsafe(parts);
};

const buildQueries = (
  sqlText: string,
  tableNamesPrefix = "",
): Array<QuerySqlToken<ZodTypeAny>> =>
  splitSqlStatements(applyTableNamesPrefix(sqlText, tableNamesPrefix)).map(
    (statement) => toUnsafeQuery(statement),
  );

const supertokensCoreV6Queries = (
  tableNamesPrefix = "",
): Array<QuerySqlToken<ZodTypeAny>> =>
  buildQueries(migrationSqlV6, tableNamesPrefix);

const supertokensCoreV7Queries = (
  tableNamesPrefix = "",
): Array<QuerySqlToken<ZodTypeAny>> =>
  buildQueries(migrationSqlV7, tableNamesPrefix);

const supertokensCoreV9Queries = (
  tableNamesPrefix = "",
): Array<QuerySqlToken<ZodTypeAny>> =>
  buildQueries(migrationSqlV9, tableNamesPrefix);

export {
  buildQueries,
  splitSqlStatements,
  supertokensCoreV6Queries,
  supertokensCoreV7Queries,
  supertokensCoreV9Queries,
  toUnsafeQuery,
};
