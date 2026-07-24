import type { ApiConfig } from "@prefabs.tech/fastify-config";

/* istanbul ignore file */
import { describe, expect, it } from "vitest";

import { TABLE_FEEDBACKS } from "../constants";
import { createFeedbacksTableQuery } from "../migrations/queries";

const makeConfig = (tableName?: string): ApiConfig =>
  ({
    feedback: {
      table: tableName ? { feedbacks: { name: tableName } } : undefined,
    },
  }) as unknown as ApiConfig;

describe("createFeedbacksTableQuery", () => {
  it("uses TABLE_FEEDBACKS constant as default table name when not configured", () => {
    const query = createFeedbacksTableQuery(makeConfig());

    expect(query.sql).toContain(TABLE_FEEDBACKS);
  });

  it("uses custom table name from config.feedback.table.feedbacks.name", () => {
    const query = createFeedbacksTableQuery(makeConfig("custom_feedbacks"));

    expect(query.sql).toContain("custom_feedbacks");
    expect(query.sql).not.toContain(`"${TABLE_FEEDBACKS}"`);
  });

  it("generates a CREATE TABLE IF NOT EXISTS statement", () => {
    const query = createFeedbacksTableQuery(makeConfig());

    expect(query.sql).toMatch(/CREATE TABLE IF NOT EXISTS/i);
  });

  it("declares type_id and message as NOT NULL columns", () => {
    const query = createFeedbacksTableQuery(makeConfig());

    expect(query.sql).toMatch(/type_id INTEGER NOT NULL/i);
    expect(query.sql).toMatch(/message TEXT NOT NULL/i);
  });

  it("creates an index on user_id", () => {
    const query = createFeedbacksTableQuery(makeConfig());

    expect(query.sql).toMatch(/CREATE INDEX IF NOT EXISTS/i);
  });
});
