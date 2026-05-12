import type { ApiConfig } from "@prefabs.tech/fastify-config";

/* istanbul ignore file */
import { describe, expect, it, vi } from "vitest";

import { TABLE_USER_DEVICES } from "../constants";
import UserDeviceSqlFactory from "../model/userDevice/sqlFactory";

const makeConfig = (tableName?: string): ApiConfig =>
  ({
    firebase: {
      table: tableName ? { userDevices: { name: tableName } } : undefined,
    },
  }) as unknown as ApiConfig;

// We only need a minimal database stub — SQL tokens are built without executing queries
const mockDatabase = {
  connect: vi.fn(),
  pool: {},
  query: vi.fn(),
} as unknown as Parameters<typeof UserDeviceSqlFactory>[1];

describe("UserDeviceSqlFactory — table getter", () => {
  it("returns TABLE_USER_DEVICES when not configured in config", () => {
    const factory = new UserDeviceSqlFactory(makeConfig(), mockDatabase);

    expect(factory.table).toBe(TABLE_USER_DEVICES);
  });

  it("returns the custom table name from config.firebase.table.userDevices.name", () => {
    const factory = new UserDeviceSqlFactory(
      makeConfig("my_devices"),
      mockDatabase,
    );

    expect(factory.table).toBe("my_devices");
  });
});

describe("UserDeviceSqlFactory — getDeleteExistingTokenSql", () => {
  it("generates a DELETE SQL statement", () => {
    const factory = new UserDeviceSqlFactory(makeConfig(), mockDatabase);
    const query = factory.getDeleteExistingTokenSql("token-abc");

    expect(query.sql).toMatch(/DELETE/i);
  });

  it("includes RETURNING * in the DELETE statement", () => {
    const factory = new UserDeviceSqlFactory(makeConfig(), mockDatabase);
    const query = factory.getDeleteExistingTokenSql("token-abc");

    expect(query.sql).toMatch(/RETURNING \*/i);
  });
});

describe("UserDeviceSqlFactory — getFindByUserIdSql", () => {
  it("generates a SELECT SQL statement", () => {
    const factory = new UserDeviceSqlFactory(makeConfig(), mockDatabase);
    const query = factory.getFindByUserIdSql("user-123");

    expect(query.sql).toMatch(/SELECT/i);
  });

  it("filters by user_id", () => {
    const factory = new UserDeviceSqlFactory(makeConfig(), mockDatabase);
    const query = factory.getFindByUserIdSql("user-123");

    expect(query.sql).toMatch(/user_id/i);
  });
});
