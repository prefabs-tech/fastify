import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SlonikOptions } from "../types";

const pgClientConstructorMock = vi.fn();
const pgClientConnectMock = vi.fn().mockResolvedValue();
const pgClientEndMock = vi.fn().mockResolvedValue();

vi.mock("pg", () => {
  const Client = pgClientConstructorMock.mockImplementation(() => ({
    connect: pgClientConnectMock,
    end: pgClientEndMock,
    query: vi.fn().mockResolvedValue({ rows: [] }),
  }));
  return { Client, default: { Client } };
});

vi.mock("@prefabs.tech/postgres-migrations", () => ({
  migrate: vi.fn().mockResolvedValue(),
}));

const baseOptions: SlonikOptions = {
  db: {
    databaseName: "testdb",
    host: "localhost",
    password: "pass",
    username: "user",
  },
};

describe("migrate — default migration path", async () => {
  const { default: migrate } = await import("../migrate");
  const { migrate: runMigrationsMock } =
    await import("@prefabs.tech/postgres-migrations");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses 'migrations' as default path when options.migrations.path is not set", async () => {
    await migrate(baseOptions);
    expect(runMigrationsMock).toHaveBeenCalledWith(
      expect.any(Object),
      "migrations",
    );
  });

  it("uses provided path when options.migrations.path is set", async () => {
    await migrate({ ...baseOptions, migrations: { path: "build/migrations" } });
    expect(runMigrationsMock).toHaveBeenCalledWith(
      expect.any(Object),
      "build/migrations",
    );
  });

  it("passes db credentials to pg.Client", async () => {
    await migrate(baseOptions);
    expect(pgClientConstructorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        database: "testdb",
        host: "localhost",
        password: "pass",
        user: "user",
      }),
    );
  });

  it("includes ssl in pg.Client config when clientConfiguration.ssl is set", async () => {
    const ssl = { rejectUnauthorized: false };
    await migrate({
      ...baseOptions,
      clientConfiguration: { ssl } as never,
    });
    expect(pgClientConstructorMock).toHaveBeenCalledWith(
      expect.objectContaining({ ssl }),
    );
  });

  it("does not include ssl in pg.Client config when clientConfiguration.ssl is not set", async () => {
    await migrate(baseOptions);
    const callArgument = pgClientConstructorMock.mock.calls[0][0];
    expect(callArgument).not.toHaveProperty("ssl");
  });

  it("connects and ends the pg client", async () => {
    await migrate(baseOptions);
    expect(pgClientConnectMock).toHaveBeenCalledOnce();
    expect(pgClientEndMock).toHaveBeenCalledOnce();
  });
});
