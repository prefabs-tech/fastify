import type { QueryFunction } from "slonik";

import { sql } from "slonik";

export type SupertokensCoreSchemaStage =
  "fresh" | "needs_v6" | "needs_v7" | "needs_v9" | "ready";

interface DetectSupertokensCoreSchemaStageOptions {
  tableNamesPrefix?: string;
  tableSchema?: string;
}

const detectSupertokensCoreSchemaStage = async (
  connection: {
    query: QueryFunction;
  },
  options: DetectSupertokensCoreSchemaStageOptions = {},
): Promise<SupertokensCoreSchemaStage> => {
  const tableNamesPrefix = options.tableNamesPrefix ?? "";
  const tableSchema = options.tableSchema ?? "public";

  const result = await connection.query(sql.unsafe`
    SELECT
      EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = ${tableSchema}
          AND table_name = ${`${tableNamesPrefix}all_auth_recipe_users`}
      ) AS "hasLegacyUsersTable",
      EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = ${tableSchema}
          AND table_name = ${`${tableNamesPrefix}apps`}
      ) AS "hasAppsTable",
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = ${tableSchema}
          AND table_name = ${`${tableNamesPrefix}app_id_to_user_id`}
          AND column_name = 'primary_or_recipe_user_id'
      ) AS "hasAccountLinking",
      EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = ${tableSchema}
          AND table_name = ${`${tableNamesPrefix}saml_clients`}
      ) AS "hasSamlTables"
  `);

  const row = result.rows[0] as
    | undefined
    | {
        hasAccountLinking?: boolean;
        hasAppsTable?: boolean;
        hasLegacyUsersTable?: boolean;
        hasSamlTables?: boolean;
      };

  if (row?.hasLegacyUsersTable !== true) {
    return "fresh";
  }

  if (row.hasAppsTable !== true) {
    return "needs_v6";
  }

  if (row.hasAccountLinking !== true) {
    return "needs_v7";
  }

  if (row.hasSamlTables !== true) {
    return "needs_v9";
  }

  return "ready";
};

export type { DetectSupertokensCoreSchemaStageOptions };
export default detectSupertokensCoreSchemaStage;
