import type { ApiConfig } from "@prefabs.tech/fastify-config";

/* istanbul ignore file */
import { describe, expect, it, vi } from "vitest";

import { TABLE_FEEDBACKS } from "../constants";
import FeedbackSqlFactory from "../model/feedback/sqlFactory";

const makeConfig = (tableName?: string): ApiConfig =>
  ({
    feedback: {
      table: tableName ? { feedbacks: { name: tableName } } : undefined,
    },
  }) as unknown as ApiConfig;

// We only need a minimal database stub — the table getter never executes queries
const mockDatabase = {
  connect: vi.fn(),
  pool: {},
  query: vi.fn(),
} as unknown as Parameters<typeof FeedbackSqlFactory>[1];

describe("FeedbackSqlFactory — table getter", () => {
  it("returns TABLE_FEEDBACKS when not configured in config", () => {
    const factory = new FeedbackSqlFactory(makeConfig(), mockDatabase);

    expect(factory.table).toBe(TABLE_FEEDBACKS);
  });

  it("returns the custom table name from config.feedback.table.feedbacks.name", () => {
    const factory = new FeedbackSqlFactory(
      makeConfig("my_feedbacks"),
      mockDatabase,
    );

    expect(factory.table).toBe("my_feedbacks");
  });
});
