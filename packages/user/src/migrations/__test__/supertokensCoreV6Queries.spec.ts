import { describe, expect, it } from "vitest";

import {
  splitSupertokensCoreV6Statements,
  supertokensCoreV6Queries,
} from "../supertokensCoreV6Queries";

describe("supertokensCoreV6Queries", () => {
  it("strips comments and nested BEGIN/COMMIT blocks", () => {
    const statements = splitSupertokensCoreV6Statements(`
      -- comment
      CREATE TABLE st__apps (id INT);
      BEGIN;
      ALTER TABLE st__key_value DROP CONSTRAINT st__key_value_pkey;
      COMMIT;
    `);

    expect(statements).toEqual([
      "CREATE TABLE st__apps (id INT)",
      "ALTER TABLE st__key_value DROP CONSTRAINT st__key_value_pkey",
    ]);
  });

  it("returns one slonik token per embedded statement", () => {
    const sample = `
      CREATE TABLE st__apps (id INT);
      ALTER TABLE st__tenants ADD COLUMN x INT;
    `;

    expect(splitSupertokensCoreV6Statements(sample)).toHaveLength(2);
    expect(supertokensCoreV6Queries().length).toBeGreaterThan(100);
  });
});
