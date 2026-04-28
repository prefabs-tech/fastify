import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Database, SlonikOptions } from "../../types";

import { EXTENSIONS } from "../../constants";
import runMigrations from "../runMigrations";

const makeDatabase = () => {
  const queryMock = vi.fn().mockResolvedValue({ rows: [] });
  const connectMock = vi.fn().mockImplementation(async (routine) => {
    const connection = { query: queryMock };
    return routine(connection);
  });

  return {
    connectMock,
    database: { connect: connectMock } as unknown as Database,
    queryMock,
  };
};

const baseOptions: SlonikOptions = {
  db: {
    databaseName: "test",
    host: "localhost",
    password: "pass",
    username: "user",
  },
};

describe("runMigrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls database.connect once", async () => {
    const { connectMock, database } = makeDatabase();
    await runMigrations(database, baseOptions);
    expect(connectMock).toHaveBeenCalledTimes(1);
  });

  it("creates an extension for each default extension", async () => {
    const { database, queryMock } = makeDatabase();
    await runMigrations(database, baseOptions);
    expect(queryMock).toHaveBeenCalledTimes(EXTENSIONS.length);
  });

  it("includes citext and unaccent by default", async () => {
    const { database, queryMock } = makeDatabase();
    await runMigrations(database, baseOptions);

    const sqls = queryMock.mock.calls.map((call) => call[0].sql as string);
    expect(sqls.some((s) => s.includes('"citext"'))).toBe(true);
    expect(sqls.some((s) => s.includes('"unaccent"'))).toBe(true);
  });

  it("merges custom extensions with defaults", async () => {
    const { database, queryMock } = makeDatabase();
    await runMigrations(database, {
      ...baseOptions,
      extensions: ["pgcrypto"],
    });

    const sqls = queryMock.mock.calls.map((call) => call[0].sql as string);
    expect(sqls.some((s) => s.includes('"pgcrypto"'))).toBe(true);
    expect(sqls.some((s) => s.includes('"citext"'))).toBe(true);
  });

  it("deduplicates extensions when custom overlaps with defaults", async () => {
    const { database, queryMock } = makeDatabase();
    await runMigrations(database, {
      ...baseOptions,
      extensions: ["citext", "pgcrypto"], // "citext" is already in EXTENSIONS
    });

    const sqls = queryMock.mock.calls.map((call) => call[0].sql as string);
    const citextCalls = sqls.filter((s) => s.includes('"citext"'));
    expect(citextCalls).toHaveLength(1);
  });

  it("calls connection.query for each unique extension", async () => {
    const { database, queryMock } = makeDatabase();
    const extraExtensions = ["pgcrypto", "uuid-ossp"];
    await runMigrations(database, {
      ...baseOptions,
      extensions: extraExtensions,
    });

    const expectedCount = new Set([...EXTENSIONS, ...extraExtensions]).size;
    expect(queryMock).toHaveBeenCalledTimes(expectedCount);
  });
});
