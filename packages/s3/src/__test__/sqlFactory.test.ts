import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { Database } from "@prefabs.tech/fastify-slonik";

import { describe, expect, it, vi } from "vitest";

vi.mock("@prefabs.tech/fastify-slonik", () => {
  class MockDefaultSqlFactory {
    config: ApiConfig;
    get table() {
      return "files";
    }
    constructor(config: ApiConfig) {
      this.config = config;
    }
  }
  return { DefaultSqlFactory: MockDefaultSqlFactory };
});

// ── FileSqlFactory ────────────────────────────────────────────────────────────

describe("FileSqlFactory — table name", async () => {
  const { default: FileSqlFactory } = await import("../model/files/sqlFactory");

  it("uses config.s3.table.name when set", () => {
    const factory = new FileSqlFactory({
      s3: { table: { name: "documents" } },
    } as unknown as ApiConfig);
    expect(factory.table).toBe("documents");
  });

  it("falls back to the default 'files' table name when not set", () => {
    const factory = new FileSqlFactory({ s3: {} } as unknown as ApiConfig);
    expect(factory.table).toBe("files");
  });

  it("falls back to the default table name when s3.table is undefined", () => {
    const factory = new FileSqlFactory({
      s3: { table: undefined },
    } as unknown as ApiConfig);
    expect(factory.table).toBe("files");
  });
});

// ── runMigrations ─────────────────────────────────────────────────────────────

describe("runMigrations", async () => {
  const { default: runMigrations } =
    await import("../migrations/runMigrations");

  it("calls database.connect once on startup", async () => {
    const mockConnection = { query: vi.fn().mockResolvedValue() };
    const mockDatabase = {
      connect: vi
        .fn()
        .mockImplementation(
          async (function_: (c: typeof mockConnection) => void) =>
            function_(mockConnection),
        ),
    };

    await runMigrations(
      mockDatabase as unknown as Database,
      { s3: {} } as unknown as ApiConfig,
    );

    expect(mockDatabase.connect).toHaveBeenCalledOnce();
  });

  it("executes exactly one query per migration run", async () => {
    const mockConnection = { query: vi.fn().mockResolvedValue() };
    const mockDatabase = {
      connect: vi
        .fn()
        .mockImplementation(
          async (function_: (c: typeof mockConnection) => void) =>
            function_(mockConnection),
        ),
    };

    await runMigrations(
      mockDatabase as unknown as Database,
      { s3: {} } as unknown as ApiConfig,
    );

    expect(mockConnection.query).toHaveBeenCalledOnce();
  });
});
