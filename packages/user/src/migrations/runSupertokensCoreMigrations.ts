import type { Database } from "@prefabs.tech/fastify-slonik";

import detectSupertokensCoreSchemaStage from "./detectSupertokensCoreSchemaStage";
import {
  supertokensCoreV6Queries,
  supertokensCoreV7Queries,
  supertokensCoreV9Queries,
} from "./supertokensCoreQueries";

type MigrationQueries = ReturnType<typeof supertokensCoreV6Queries>;
type MigrationStage = [label: string, queries: MigrationQueries];

interface RunSupertokensCoreMigrationsOptions {
  tableNamesPrefix?: string;
  tableSchema?: string;
}

interface RunSupertokensCoreMigrationsResult {
  applied: string[];
  tableNamesPrefix: string;
  tableSchema: string;
}

const runSupertokensCoreMigrations = async (
  database: Database,
  options: RunSupertokensCoreMigrationsOptions = {},
): Promise<RunSupertokensCoreMigrationsResult> => {
  const tableNamesPrefix = options.tableNamesPrefix ?? "";
  const tableSchema = options.tableSchema ?? "public";
  const applied: string[] = [];

  await database.connect(async (connection) => {
    await connection.transaction(async (transactionConnection) => {
      const stage = await detectSupertokensCoreSchemaStage(
        transactionConnection,
        {
          tableNamesPrefix,
          tableSchema,
        },
      );

      const stagesToApply: MigrationStage[] =
        stage === "needs_v6"
          ? [
              ["5→6", supertokensCoreV6Queries(tableNamesPrefix)],
              ["6→7", supertokensCoreV7Queries(tableNamesPrefix)],
              ["7→9", supertokensCoreV9Queries(tableNamesPrefix)],
            ]
          : stage === "needs_v7"
            ? [
                ["6→7", supertokensCoreV7Queries(tableNamesPrefix)],
                ["7→9", supertokensCoreV9Queries(tableNamesPrefix)],
              ]
            : stage === "needs_v9"
              ? [["7→9", supertokensCoreV9Queries(tableNamesPrefix)]]
              : [];

      for (const [label, queries] of stagesToApply) {
        for (const query of queries) {
          await transactionConnection.query(query);
        }

        applied.push(label);
      }
    });
  });

  return {
    applied,
    tableNamesPrefix,
    tableSchema,
  };
};

export type {
  RunSupertokensCoreMigrationsOptions,
  RunSupertokensCoreMigrationsResult,
};
export default runSupertokensCoreMigrations;
