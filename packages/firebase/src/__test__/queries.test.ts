import type { ApiConfig } from "@prefabs.tech/fastify-config";

/* istanbul ignore file */
import { describe, expect, it } from "vitest";

import { TABLE_USER_DEVICES } from "../constants";
import { createUserDevicesTableQuery } from "../migrations/queries";

const makeConfig = (tableName?: string): ApiConfig =>
  ({
    firebase: {
      table: tableName ? { userDevices: { name: tableName } } : undefined,
    },
  }) as unknown as ApiConfig;

describe("createUserDevicesTableQuery", () => {
  it("uses TABLE_USER_DEVICES constant as default table name when not configured", () => {
    const query = createUserDevicesTableQuery(makeConfig());

    expect(query.sql).toContain(TABLE_USER_DEVICES);
  });

  it("uses custom table name from config.firebase.table.userDevices.name", () => {
    const query = createUserDevicesTableQuery(makeConfig("custom_devices"));

    expect(query.sql).toContain("custom_devices");
    expect(query.sql).not.toContain(TABLE_USER_DEVICES);
  });

  it("generates a CREATE TABLE IF NOT EXISTS statement", () => {
    const query = createUserDevicesTableQuery(makeConfig());

    expect(query.sql).toMatch(/CREATE TABLE IF NOT EXISTS/i);
  });

  it("creates index on user_id and device_token", () => {
    const query = createUserDevicesTableQuery(makeConfig());

    expect(query.sql).toMatch(/CREATE INDEX IF NOT EXISTS/i);
  });
});
