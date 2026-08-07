import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { Database } from "@prefabs.tech/fastify-slonik";

import { sql } from "slonik";
import { describe, expect, it, vi } from "vitest";

const mockSupertokensCoreV6Queries = vi.fn(() => [
  sql.unsafe`SELECT 1 AS st_v6_migration_probe`,
]);

vi.mock("../supertokensCoreV6Queries", () => ({
  supertokensCoreV6Queries: () => mockSupertokensCoreV6Queries(),
}));

import runMigrations from "../runMigrations";

describe("runMigrations", () => {
  it("runs SuperTokens core v6 migration queries after users and invitations", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
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

    const config = {
      user: {
        supertokens: { connectionUri: "postgresql://localhost/st" },
      },
    } as ApiConfig;

    await runMigrations(config, database);

    expect(mockSupertokensCoreV6Queries).toHaveBeenCalledOnce();
    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls[2]?.[0]).toBe(
      mockSupertokensCoreV6Queries.mock.results[0]?.value[0],
    );
  });
});
