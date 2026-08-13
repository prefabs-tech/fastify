import { describe, expect, it } from "vitest";

import {
  splitSqlStatements,
  supertokensCoreV7Queries,
  toUnsafeQuery,
} from "../supertokensCoreQueries";

describe("supertokensCoreQueries", () => {
  it("splits statement-oriented SQL and removes transaction wrappers", () => {
    const statements = splitSqlStatements(`
      -- comment
      BEGIN;
      CREATE TABLE apps (id INT);
      COMMIT;
      ALTER TABLE tenants ADD COLUMN foo INT;
    `);

    expect(statements).toEqual([
      "CREATE TABLE apps (id INT)",
      "ALTER TABLE tenants ADD COLUMN foo INT",
    ]);
  });

  it("creates raw sql.unsafe tokens without parameterising the statement", () => {
    const query = toUnsafeQuery("CREATE TABLE apps (id INT)");

    expect(query.sql).toBe("CREATE TABLE apps (id INT);");
    expect(query.values).toEqual([]);
  });

  it("materializes prefixed core migration queries", () => {
    const [firstQuery] = supertokensCoreV7Queries("st__");

    expect(firstQuery?.sql).toContain("ALTER TABLE st__all_auth_recipe_users");
  });
});
