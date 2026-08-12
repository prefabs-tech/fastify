import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { Database } from "@prefabs.tech/fastify-slonik";

import { sql } from "slonik";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSupertokensCoreV6Queries = vi.fn(() => [
  sql.unsafe`SELECT 1 AS st_v6_migration_probe`,
]);

const mockShouldRunSupertokensCoreV6Migration = vi.fn();

vi.mock("../supertokensCoreV6Queries", () => ({
  supertokensCoreV6Queries: () => mockSupertokensCoreV6Queries(),
}));

vi.mock("../shouldRunSupertokensCoreV6Migration", () => ({
  default: (...arguments_: unknown[]) =>
    mockShouldRunSupertokensCoreV6Migration(...arguments_),
}));

import runMigrations from "../runMigrations";

const buildDatabase = (query: ReturnType<typeof vi.fn>) => {
  const transactionConnection = { query };
  const connection = {
    transaction: async (
      callback: (tx: typeof transactionConnection) => Promise<void>,
    ) => callback(transactionConnection),
  };
  const database = {
    connect: async (callback: (conn: typeof connection) => Promise<void>) =>
      callback(connection),
  } as unknown as Database;

  return { database, transactionConnection };
};

const config = {
  user: {
    supertokens: { connectionUri: "postgresql://localhost/st" },
  },
} as ApiConfig;

describe("runMigrations", () => {
  beforeEach(() => {
    mockSupertokensCoreV6Queries.mockClear();
    mockShouldRunSupertokensCoreV6Migration.mockReset();
  });

  it("runs SuperTokens core v6 migration queries after users and invitations when legacy schema is detected", async () => {
    mockShouldRunSupertokensCoreV6Migration.mockResolvedValue(true);
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const { database, transactionConnection } = buildDatabase(query);

    await runMigrations(config, database);

    expect(mockShouldRunSupertokensCoreV6Migration).toHaveBeenCalledOnce();
    expect(mockShouldRunSupertokensCoreV6Migration).toHaveBeenCalledWith(
      transactionConnection,
      "public",
    );
    expect(mockSupertokensCoreV6Queries).toHaveBeenCalledOnce();
    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls[2]?.[0]).toBe(
      mockSupertokensCoreV6Queries.mock.results[0]?.value[0],
    );
  });

  it("passes config.user.supertokens.tableSchema to the migration gate", async () => {
    mockShouldRunSupertokensCoreV6Migration.mockResolvedValue(false);
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const { database, transactionConnection } = buildDatabase(query);

    await runMigrations(
      {
        user: {
          supertokens: {
            connectionUri: "postgresql://localhost/st",
            tableSchema: "supertokens",
          },
        },
      } as ApiConfig,
      database,
    );

    expect(mockShouldRunSupertokensCoreV6Migration).toHaveBeenCalledWith(
      transactionConnection,
      "supertokens",
    );
  });

  it("skips SuperTokens core v6 migration queries when core 7+ schema is detected", async () => {
    mockShouldRunSupertokensCoreV6Migration.mockResolvedValue(false);
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const { database, transactionConnection } = buildDatabase(query);

    await runMigrations(config, database);

    expect(mockShouldRunSupertokensCoreV6Migration).toHaveBeenCalledOnce();
    expect(mockShouldRunSupertokensCoreV6Migration).toHaveBeenCalledWith(
      transactionConnection,
      "public",
    );
    expect(mockSupertokensCoreV6Queries).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalledTimes(2);
  });
});
