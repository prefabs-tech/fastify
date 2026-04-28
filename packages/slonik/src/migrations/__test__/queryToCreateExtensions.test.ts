import { describe, expect, it } from "vitest";

import queryToCreateExtension from "../queryToCreateExtensions";

describe("queryToCreateExtension", () => {
  it("returns an object with a sql string", () => {
    const result = queryToCreateExtension("citext");
    expect(typeof result.sql).toBe("string");
  });

  it("generated SQL contains CREATE EXTENSION IF NOT EXISTS", () => {
    const result = queryToCreateExtension("citext");
    expect(result.sql).toMatch(/CREATE EXTENSION IF NOT EXISTS/i);
  });

  it("generated SQL references the provided extension name as an identifier", () => {
    const result = queryToCreateExtension("unaccent");
    expect(result.sql).toContain('"unaccent"');
  });

  it("works for any extension name", () => {
    const result = queryToCreateExtension("pgcrypto");
    expect(result.sql).toContain('"pgcrypto"');
  });
});
