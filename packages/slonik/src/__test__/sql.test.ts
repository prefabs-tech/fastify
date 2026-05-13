import { sql } from "slonik";
import { describe, expect, it } from "vitest";

import {
  createFilterFragment,
  createLimitFragment,
  createSortFragment,
  createTableFragment,
  createTableIdentifier,
  createWhereFragment,
  createWhereIdFragment,
  isValueExpression,
} from "../sql";

describe("isValueExpression", () => {
  it("should return true for valid ValueExpression types", () => {
    // eslint-disable-next-line unicorn/no-null
    expect(isValueExpression(null)).toBe(true);
    expect(isValueExpression("string")).toBe(true);
    expect(isValueExpression(123)).toBe(true);
    expect(isValueExpression(true)).toBe(true);
    expect(isValueExpression(false)).toBe(true);
    expect(isValueExpression(new Date())).toBe(true);
    expect(isValueExpression(Buffer.from("test"))).toBe(true);
    expect(isValueExpression([1, 2, 3])).toBe(true);
  });

  it("should return false for invalid ValueExpression types", () => {
    expect(isValueExpression(() => {})).toBe(false);
    expect(isValueExpression({})).toBe(false);
    expect(isValueExpression(Symbol("test"))).toBe(false);
    expect(isValueExpression(new Map())).toBe(false);
    expect(isValueExpression(new Set())).toBe(false);
  });

  it("should return true for nested valid ValueExpression structures", () => {
    // eslint-disable-next-line unicorn/no-null
    expect(isValueExpression([null, "string", 123, true, new Date()])).toBe(
      true,
    );
  });

  it("should return false for invalid nested structures", () => {
    // eslint-disable-next-line unicorn/no-null
    expect(isValueExpression([null, "string", () => {}])).toBe(false);
    expect(
      isValueExpression([{ type: Symbol("valid") }, { invalidKey: "invalid" }]),
    ).toBe(false);
  });
});

describe("createWhereIdFragment", () => {
  it("returns a fragment containing WHERE id =", () => {
    const fragment = createWhereIdFragment(1);
    expect(fragment.sql).toMatch(/WHERE id = \$slonik_\d+/);
  });

  it("works with a numeric id", () => {
    const fragment = createWhereIdFragment(42);
    expect(fragment.values).toContain(42);
  });

  it("works with a string id", () => {
    const fragment = createWhereIdFragment("abc-123");
    expect(fragment.values).toContain("abc-123");
  });
});

describe("createFilterFragment", () => {
  const tableIdentifier = createTableIdentifier("users");

  it("returns an empty fragment when no filters provided", () => {
    const fragment = createFilterFragment(undefined, tableIdentifier);
    expect(fragment.sql.trim()).toBe("");
  });

  it("returns a WHERE clause when filters are provided", () => {
    const fragment = createFilterFragment(
      { key: "name", operator: "eq", value: "alice" },
      tableIdentifier,
    );
    expect(fragment.sql).toMatch(/WHERE/);
  });
});

describe("createLimitFragment", () => {
  it("returns LIMIT n without offset", () => {
    const fragment = createLimitFragment(10);
    expect(fragment.sql).toContain("LIMIT");
    expect(fragment.values).toContain(10);
    expect(fragment.sql).not.toContain("OFFSET");
  });

  it("returns LIMIT n OFFSET m when offset is provided", () => {
    const fragment = createLimitFragment(10, 20);
    expect(fragment.sql).toContain("LIMIT");
    expect(fragment.sql).toContain("OFFSET");
    expect(fragment.values).toContain(10);
    expect(fragment.values).toContain(20);
  });

  it("does not include OFFSET when offset is 0 (falsy)", () => {
    const fragment = createLimitFragment(10, 0);
    expect(fragment.sql).not.toContain("OFFSET");
  });
});

describe("createTableFragment", () => {
  it("returns unqualified identifier when no schema given", () => {
    const fragment = createTableFragment("users");
    expect(fragment.sql).toMatch(/"users"/);
  });

  it("returns schema-qualified identifier when schema given", () => {
    const fragment = createTableFragment("users", "tenant1");
    expect(fragment.sql).toMatch(/"tenant1"\."users"/);
  });
});

describe("createWhereFragment", () => {
  const tableIdentifier = createTableIdentifier("users");

  it("returns empty fragment when no filters and no extra fragments", () => {
    const fragment = createWhereFragment(tableIdentifier);
    expect(fragment.sql.trim()).toBe("");
  });

  it("returns WHERE clause when filters are provided", () => {
    const fragment = createWhereFragment(tableIdentifier, {
      key: "name",
      operator: "eq",
      value: "alice",
    });
    expect(fragment.sql).toMatch(/WHERE/i);
  });

  it("returns WHERE clause when only extra fragments are provided", () => {
    const extra = sql.fragment`status = 'active'`;
    const fragment = createWhereFragment(tableIdentifier, undefined, [extra]);
    expect(fragment.sql).toMatch(/WHERE/i);
  });

  it("combines filters and extra fragments with AND", () => {
    const extra = sql.fragment`status = 'active'`;
    const fragment = createWhereFragment(
      tableIdentifier,
      { key: "name", operator: "eq", value: "alice" },
      [extra],
    );
    expect(fragment.sql).toMatch(/AND/i);
  });

  it("strips leading WHERE keyword from extra fragments", () => {
    const extraWithWhere = sql.fragment`WHERE status = 'active'`;
    const fragment = createWhereFragment(tableIdentifier, undefined, [
      extraWithWhere,
    ]);
    // Should produce a single WHERE clause, not WHERE WHERE
    const whereCount = (fragment.sql.match(/WHERE/gi) || []).length;
    expect(whereCount).toBe(1);
  });
});

describe("createSortFragment", () => {
  const tableIdentifier = createTableIdentifier("users");

  it("returns an empty fragment when sort array is empty", () => {
    const fragment = createSortFragment(tableIdentifier, []);
    expect(fragment.sql.trim()).toBe("");
  });

  it("returns an ORDER BY clause for a single sort entry", () => {
    const fragment = createSortFragment(tableIdentifier, [
      { direction: "ASC", key: "name" },
    ]);
    expect(fragment.sql).toMatch(/ORDER BY/);
  });

  it("returns DESC when direction is DESC", () => {
    const fragment = createSortFragment(tableIdentifier, [
      { direction: "DESC", key: "id" },
    ]);
    expect(fragment.sql).toContain("DESC");
  });

  it("returns empty fragment when sort is undefined", () => {
    const fragment = createSortFragment(tableIdentifier);
    expect(fragment.sql.trim()).toBe("");
  });
});
