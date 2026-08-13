import { beforeEach, describe, expect, it, vi } from "vitest";

const detectStage = vi.fn();
const v6Queries = vi.fn();
const v7Queries = vi.fn();
const v9Queries = vi.fn();

vi.mock("../detectSupertokensCoreSchemaStage", () => ({
  default: detectStage,
}));

vi.mock("../supertokensCoreQueries", () => ({
  supertokensCoreV6Queries: v6Queries,
  supertokensCoreV7Queries: v7Queries,
  supertokensCoreV9Queries: v9Queries,
}));

describe("runSupertokensCoreMigrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    v6Queries.mockReturnValue([{ sql: "v6" }]);
    v7Queries.mockReturnValue([{ sql: "v7" }]);
    v9Queries.mockReturnValue([{ sql: "v9" }]);
  });

  it("applies all hops for a legacy schema", async () => {
    detectStage.mockResolvedValue("needs_v6");
    const query = vi.fn().mockResolvedValue(undefined);
    const database = {
      connect: async (handler: (connection: unknown) => Promise<void>) =>
        handler({
          transaction: async (
            callback: (transactionConnection: unknown) => Promise<void>,
          ) => callback({ query }),
        }),
    };

    const { default: runSupertokensCoreMigrations } =
      await import("../runSupertokensCoreMigrations");

    await expect(
      runSupertokensCoreMigrations(database as never, {
        tableNamesPrefix: "st__",
        tableSchema: "public",
      }),
    ).resolves.toEqual({
      applied: ["5→6", "6→7", "7→9"],
      tableNamesPrefix: "st__",
      tableSchema: "public",
    });

    expect(detectStage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tableNamesPrefix: "st__",
        tableSchema: "public",
      }),
    );
    expect(query).toHaveBeenCalledTimes(3);
  });

  it("is a no-op when the schema is already ready", async () => {
    detectStage.mockResolvedValue("ready");
    const query = vi.fn().mockResolvedValue(undefined);
    const database = {
      connect: async (handler: (connection: unknown) => Promise<void>) =>
        handler({
          transaction: async (
            callback: (transactionConnection: unknown) => Promise<void>,
          ) => callback({ query }),
        }),
    };

    const { default: runSupertokensCoreMigrations } =
      await import("../runSupertokensCoreMigrations");

    await expect(
      runSupertokensCoreMigrations(database as never),
    ).resolves.toEqual({
      applied: [],
      tableNamesPrefix: "",
      tableSchema: "public",
    });

    expect(query).not.toHaveBeenCalled();
  });
});
