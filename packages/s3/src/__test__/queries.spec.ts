import type { ApiConfig } from "@prefabs.tech/fastify-config";

import { describe, expect, it } from "vitest";

import type { S3Options } from "../types";

import { createFilesTableQuery } from "../migrations/queries";

describe("createFilesTableQuery", () => {
  it("uses the table name from S3Options (new pattern)", () => {
    const query = createFilesTableQuery({
      table: { name: "uploaded_files" },
    } as S3Options);

    expect(query.sql).toContain(`"uploaded_files"`);
  });

  it("uses the table name from a full ApiConfig (deprecated pattern)", () => {
    const query = createFilesTableQuery({
      s3: { table: { name: "legacy_files" } },
    } as unknown as ApiConfig);

    expect(query.sql).toContain(`"legacy_files"`);
  });

  it("defaults the table name to files", () => {
    const query = createFilesTableQuery({} as S3Options);

    expect(query.sql).toContain(`"files"`);
  });
});
