import { sql } from "slonik";
import { describe, it, expect } from "vitest";

import { applyFiltersToQuery, applyFilter } from "../filters";

import type { FilterInput, BaseFilterInput } from "../types";
import type { IdentifierSqlToken } from "slonik";

// Comprehensive dataset of filter combinations for testing
const getFilterDataset = (): Array<{
  name: string;
  filter: FilterInput;
  expectedSQL: RegExp;
  expectedValues: string[];
  description: string;
}> => {
  return [
    {
      name: "Simple equality filter",
      filter: { key: "name", operator: "eq", value: "test" },
      expectedSQL: /WHERE "users"\."name" = \$slonik_\d+$/,
      expectedValues: ["test"],
      description: "Basic equality operation",
    },
    {
      name: "Simple starts with filter",
      filter: { key: "name", operator: "sw", value: "test" },
      expectedSQL: /WHERE "users"\."name" ILIKE \$slonik_\d+$/,
      expectedValues: ["test%"],
      description: "Starts with operation",
    },
    {
      name: "Simple AND operation",
      filter: {
        AND: [
          { key: "name", operator: "sw", value: "test" },
          { key: "age", operator: "gt", value: "25" },
        ],
      },
      expectedSQL:
        /WHERE \("users"\."name" ILIKE \$slonik_\d+ AND "users"\."age" > \$slonik_\d+\)/,
      expectedValues: ["test%", "25"],
      description: "Simple AND with two conditions",
    },
    {
      name: "Simple OR operation",
      filter: {
        OR: [
          { key: "name", operator: "sw", value: "Test" },
          { key: "name", operator: "ew", value: "t1" },
        ],
      },
      expectedSQL:
        /WHERE \("users"\."name" ILIKE \$slonik_\d+ OR "users"\."name" ILIKE \$slonik_\d+\)/,
      expectedValues: ["Test%", "%t1"],
      description: "Simple OR with two conditions",
    },
    {
      name: "AND with nested OR",
      filter: {
        AND: [
          { key: "id", operator: "gt", value: "10" },
          {
            OR: [
              { key: "name", operator: "sw", value: "Test" },
              { key: "name", operator: "ew", value: "t1" },
            ],
          },
        ],
      },
      expectedSQL:
        /WHERE \("users"\."id" > \$slonik_\d+ AND \("users"\."name" ILIKE \$slonik_\d+ OR "users"\."name" ILIKE \$slonik_\d+\)\)/,
      expectedValues: ["10", "Test%", "%t1"],
      description: "AND containing OR - tests proper nesting",
    },
    {
      name: "OR with nested AND",
      filter: {
        OR: [
          { key: "id", operator: "gt", value: "10" },
          {
            AND: [
              { key: "name", operator: "sw", value: "Test" },
              { key: "name", operator: "ew", value: "t1" },
            ],
          },
        ],
      },
      expectedSQL:
        /WHERE \("users"\."id" > \$slonik_\d+ OR \("users"\."name" ILIKE \$slonik_\d+ AND "users"\."name" ILIKE \$slonik_\d+\)\)/,
      expectedValues: ["10", "Test%", "%t1"],
      description: "OR containing AND - tests proper nesting",
    },
    {
      name: "OR with multiple AND blocks",
      filter: {
        OR: [
          {
            AND: [
              { key: "name", operator: "sw", value: "Test" },
              { key: "age", operator: "gt", value: "25" },
            ],
          },
          {
            AND: [
              { key: "email", operator: "ew", value: "@test.com" },
              { key: "status", operator: "eq", value: "active" },
            ],
          },
        ],
      },
      expectedSQL:
        /WHERE \(\("users"\."name" ILIKE \$slonik_\d+ AND "users"\."age" > \$slonik_\d+\) OR \("users"\."email" ILIKE \$slonik_\d+ AND "users"\."status" = \$slonik_\d+\)\)/,
      expectedValues: ["Test%", "25", "%@test.com", "active"],
      description: "OR with multiple AND blocks - tests complex grouping",
    },
    {
      name: "Complex nested structure",
      filter: {
        OR: [
          {
            AND: [
              { key: "name", operator: "sw", value: "Test" },
              {
                OR: [
                  { key: "department", operator: "eq", value: "engineering" },
                  { key: "department", operator: "eq", value: "design" },
                ],
              },
            ],
          },
          {
            AND: [
              { key: "role", operator: "eq", value: "admin" },
              { key: "verified", operator: "eq", value: "true" },
            ],
          },
        ],
      },
      expectedSQL:
        /WHERE \(\("users"\."name" ILIKE \$slonik_\d+ AND \("users"\."department" = \$slonik_\d+ OR "users"\."department" = \$slonik_\d+\)\) OR \("users"\."role" = \$slonik_\d+ AND "users"\."verified" = \$slonik_\d+\)\)/,
      expectedValues: ["Test%", "engineering", "design", "admin", "true"],
      description: "Deep nesting: OR[AND[condition, OR[...]], AND[...]]",
    },
    {
      name: "Triple nested structure",
      filter: {
        AND: [
          { key: "status", operator: "eq", value: "active" },
          {
            OR: [
              {
                AND: [
                  { key: "age", operator: "gte", value: "18" },
                  { key: "age", operator: "lte", value: "65" },
                ],
              },
              {
                OR: [
                  { key: "role", operator: "eq", value: "admin" },
                  { key: "special", operator: "eq", value: "true" },
                ],
              },
            ],
          },
        ],
      },
      expectedSQL:
        /WHERE \("users"\."status" = \$slonik_\d+ AND \(\("users"\."age" >= \$slonik_\d+ AND "users"\."age" <= \$slonik_\d+\) OR \("users"\."role" = \$slonik_\d+ OR "users"\."special" = \$slonik_\d+\)\)\)/,
      expectedValues: ["active", "18", "65", "admin", "true"],
      description: "Triple nesting: AND[condition, OR[AND[...], OR[...]]]",
    },
    {
      name: "Single condition in AND array",
      filter: {
        AND: [{ key: "name", operator: "eq", value: "test" }],
      },
      expectedSQL: /WHERE "users"\."name" = \$slonik_\d+$/,
      expectedValues: ["test"],
      description: "Single condition should not have extra parentheses",
    },
    {
      name: "Single condition in OR array",
      filter: {
        OR: [{ key: "status", operator: "eq", value: "active" }],
      },
      expectedSQL: /WHERE "users"\."status" = \$slonik_\d+$/,
      expectedValues: ["active"],
      description: "Single condition should not have extra parentheses",
    },
    {
      name: "Multiple operators test",
      filter: {
        AND: [
          { key: "name", operator: "ct", value: "test" },
          { key: "age", operator: "bt", value: "25,65" },
          { key: "status", operator: "in", value: "active,pending" },
          { key: "deletedAt", operator: "eq", value: "null" },
        ],
      },
      expectedSQL:
        /WHERE \("users"\."name" ILIKE \$slonik_\d+ AND "users"\."age" BETWEEN \$slonik_\d+ AND \$slonik_\d+ AND "users"\."status" IN \(\$slonik_\d+, \$slonik_\d+\) AND "users"\."deleted_at" IS NULL\)/,
      expectedValues: ["%test%", "25", "65", "active", "pending"],
      description: "Tests all different operators",
    },
    {
      name: "NOT flag operations",
      filter: {
        AND: [
          { key: "name", operator: "eq", value: "test", not: true },
          {
            key: "status",
            operator: "in",
            value: "inactive,banned",
            not: true,
          },
        ],
      },
      expectedSQL:
        /WHERE \("users"\."name" != \$slonik_\d+ AND "users"\."status" NOT IN \(\$slonik_\d+, \$slonik_\d+\)\)/,
      expectedValues: ["test", "inactive", "banned"],
      description: "Tests NOT flag with different operators",
    },
  ];
};

describe("dbFilters", () => {
  const mockTableIdentifier: IdentifierSqlToken = sql.identifier(["users"]);
  const mockSchemaTableIdentifier: IdentifierSqlToken = sql.identifier([
    "public",
    "users",
  ]);

  describe("applyFilter > standard cases", () => {
    it("should handle equality operator", () => {
      const filter: BaseFilterInput = {
        key: "name",
        operator: "eq",
        value: "John",
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain('"users"."name" = $slonik_');
      expect(result.values).toEqual(["John"]);
    });

    it("should handle equality operator with not flag", () => {
      const filter: BaseFilterInput = {
        key: "name",
        operator: "eq",
        value: "John",
        not: true,
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain('"users"."name" != $slonik_');
      expect(result.values).toEqual(["John"]);
    });

    it("should handle null values", () => {
      const filter: BaseFilterInput = {
        key: "deletedAt",
        operator: "eq",
        value: "null",
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain('"users"."deleted_at" IS NULL');
      expect(result.values).toEqual([]);
    });

    it("should handle null values with not flag", () => {
      const filter: BaseFilterInput = {
        key: "deletedAt",
        operator: "eq",
        value: "NULL",
        not: true,
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain('"users"."deleted_at" IS NOT NULL');
      expect(result.values).toEqual([]);
    });

    it("should handle contains operator", () => {
      const filter: BaseFilterInput = {
        key: "name",
        operator: "ct",
        value: "John",
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain('"users"."name" ILIKE $slonik_');
      expect(result.values).toEqual(["%John%"]);
    });

    it("should handle starts with operator", () => {
      const filter: BaseFilterInput = {
        key: "name",
        operator: "sw",
        value: "John",
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain('"users"."name" ILIKE $slonik_');
      expect(result.values).toEqual(["John%"]);
    });

    it("should handle ends with operator", () => {
      const filter: BaseFilterInput = {
        key: "name",
        operator: "ew",
        value: "son",
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain('"users"."name" ILIKE $slonik_');
      expect(result.values).toEqual(["%son"]);
    });

    it("should handle greater than operator", () => {
      const filter: BaseFilterInput = {
        key: "age",
        operator: "gt",
        value: "25",
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain('"users"."age" > $slonik_');
      expect(result.values).toEqual(["25"]);
    });

    it("should handle greater than or equal operator", () => {
      const filter: BaseFilterInput = {
        key: "age",
        operator: "gte",
        value: "25",
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain('"users"."age" >= $slonik_');
      expect(result.values).toEqual(["25"]);
    });

    it("should handle less than operator", () => {
      const filter: BaseFilterInput = {
        key: "age",
        operator: "lt",
        value: "65",
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain('"users"."age" < $slonik_');
      expect(result.values).toEqual(["65"]);
    });

    it("should handle less than or equal operator", () => {
      const filter: BaseFilterInput = {
        key: "age",
        operator: "lte",
        value: "65",
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain('"users"."age" <= $slonik_');
      expect(result.values).toEqual(["65"]);
    });

    it("should handle in operator", () => {
      const filter: BaseFilterInput = {
        key: "status",
        operator: "in",
        value: "active,inactive,pending",
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain('"users"."status" IN ($slonik_');
      expect(result.values).toEqual(["active", "inactive", "pending"]);
    });

    it("should handle between operator", () => {
      const filter: BaseFilterInput = {
        key: "age",
        operator: "bt",
        value: "25,65",
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain('"users"."age" BETWEEN $slonik_');
      expect(result.values).toEqual(["25", "65"]);
    });

    it("should convert camelCase keys to snake_case", () => {
      const filter: BaseFilterInput = {
        key: "firstName",
        operator: "eq",
        value: "John",
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain('"users"."first_name" = $slonik_');
      expect(result.values).toEqual(["John"]);
    });

    it("should handle schema.table identifiers", () => {
      const filter: BaseFilterInput = {
        key: "name",
        operator: "eq",
        value: "John",
      };

      const result = applyFilter(mockSchemaTableIdentifier, filter);

      expect(result.sql).toContain('"public"."users"."name" = $slonik_');
      expect(result.values).toEqual(["John"]);
    });

    // Join table / dotted key test cases
    describe("Join table scenarios (keys with dots)", () => {
      it("should handle simple join table key without table identifier", () => {
        const filter: BaseFilterInput = {
          key: "posts.title",
          operator: "eq",
          value: "My Post",
        };

        const result = applyFilter(mockTableIdentifier, filter);

        expect(result.sql).toContain('"posts"."title" = $slonik_');
        expect(result.values).toEqual(["My Post"]);
      });

      it("should handle join table key with camelCase conversion", () => {
        const filter: BaseFilterInput = {
          key: "userProfiles.firstName",
          operator: "eq",
          value: "John",
        };

        const result = applyFilter(mockTableIdentifier, filter);

        expect(result.sql).toContain('"user_profiles"."first_name" = $slonik_');
        expect(result.values).toEqual(["John"]);
      });

      it("should handle three-part join table key (schema.table.column)", () => {
        const filter: BaseFilterInput = {
          key: "public.posts.title",
          operator: "ct",
          value: "test",
        };

        const result = applyFilter(mockTableIdentifier, filter);

        expect(result.sql).toContain('"public"."posts"."title" ILIKE $slonik_');
        expect(result.values).toEqual(["%test%"]);
      });

      it("should handle join table key with complex operators", () => {
        const filter: BaseFilterInput = {
          key: "posts.createdAt",
          operator: "bt",
          value: "2023-01-01,2023-12-31",
        };

        const result = applyFilter(mockTableIdentifier, filter);

        expect(result.sql).toContain('"posts"."created_at" BETWEEN $slonik_');
        expect(result.values).toEqual(["2023-01-01", "2023-12-31"]);
      });

      it("should handle join table key with NOT flag", () => {
        const filter: BaseFilterInput = {
          key: "posts.status",
          operator: "in",
          value: "draft,archived",
          not: true,
        };

        const result = applyFilter(mockTableIdentifier, filter);

        expect(result.sql).toContain('"posts"."status" NOT IN ($slonik_');
        expect(result.values).toEqual(["draft", "archived"]);
      });

      it("should handle join table key with null values", () => {
        const filter: BaseFilterInput = {
          key: "posts.deletedAt",
          operator: "eq",
          value: "null",
        };

        const result = applyFilter(mockTableIdentifier, filter);

        expect(result.sql).toContain('"posts"."deleted_at" IS NULL');
        expect(result.values).toEqual([]);
      });

      it("should handle join table key with null values and NOT flag", () => {
        const filter: BaseFilterInput = {
          key: "comments.deletedAt",
          operator: "eq",
          value: "NULL",
          not: true,
        };

        const result = applyFilter(mockTableIdentifier, filter);

        expect(result.sql).toContain('"comments"."deleted_at" IS NOT NULL');
        expect(result.values).toEqual([]);
      });
    });
  });

  describe("applyFilter > case insensitive", () => {
    it("should handle equality operator", () => {
      const filter: BaseFilterInput = {
        key: "name",
        operator: "eq",
        value: "John",
        insensitive: true,
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain(
        'unaccent(lower("users"."name")) = unaccent(lower($slonik_1))',
      );
      expect(result.values).toEqual(["John"]);
    });

    it("should handle equality operator with not flag", () => {
      const filter: BaseFilterInput = {
        key: "name",
        operator: "eq",
        value: "John",
        not: true,
        insensitive: true,
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain(
        'unaccent(lower("users"."name")) != unaccent(lower($slonik_1))',
      );
      expect(result.values).toEqual(["John"]);
    });

    it("should handle null values", () => {
      const filter: BaseFilterInput = {
        key: "deletedAt",
        operator: "eq",
        value: "null",
        insensitive: true,
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain('"users"."deleted_at" IS NULL');
      expect(result.values).toEqual([]);
    });

    it("should handle null values with not flag", () => {
      const filter: BaseFilterInput = {
        key: "deletedAt",
        operator: "eq",
        value: "NULL",
        not: true,
        insensitive: true,
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain('"users"."deleted_at" IS NOT NULL');
      expect(result.values).toEqual([]);
    });

    it("should handle contains operator", () => {
      const filter: BaseFilterInput = {
        key: "name",
        operator: "ct",
        value: "John",
        insensitive: true,
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain(
        'unaccent(lower("users"."name")) ILIKE unaccent(lower($slonik_1))',
      );
      expect(result.values).toEqual(["%John%"]);
    });

    it("should handle starts with operator", () => {
      const filter: BaseFilterInput = {
        key: "name",
        operator: "sw",
        value: "John",
        insensitive: true,
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain(
        'unaccent(lower("users"."name")) ILIKE unaccent(lower($slonik_1))',
      );
      expect(result.values).toEqual(["John%"]);
    });

    it("should handle ends with operator", () => {
      const filter: BaseFilterInput = {
        key: "name",
        operator: "ew",
        value: "son",
        insensitive: true,
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain(
        'unaccent(lower("users"."name")) ILIKE unaccent(lower($slonik_1))',
      );
      expect(result.values).toEqual(["%son"]);
    });

    it("should handle greater than operator", () => {
      const filter: BaseFilterInput = {
        key: "age",
        operator: "gt",
        value: "25",
        insensitive: true,
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain(
        'unaccent(lower("users"."age")) > unaccent(lower($slonik_1))',
      );
      expect(result.values).toEqual(["25"]);
    });

    it("should handle greater than or equal operator", () => {
      const filter: BaseFilterInput = {
        key: "age",
        operator: "gte",
        value: "25",
        insensitive: true,
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain(
        'unaccent(lower("users"."age")) >= unaccent(lower($slonik_1))',
      );
      expect(result.values).toEqual(["25"]);
    });

    it("should handle less than operator", () => {
      const filter: BaseFilterInput = {
        key: "age",
        operator: "lt",
        value: "65",
        insensitive: true,
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain(
        'unaccent(lower("users"."age")) < unaccent(lower($slonik_1))',
      );
      expect(result.values).toEqual(["65"]);
    });

    it("should handle less than or equal operator", () => {
      const filter: BaseFilterInput = {
        key: "age",
        operator: "lte",
        value: "65",
        insensitive: true,
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain(
        'unaccent(lower("users"."age")) <= unaccent(lower($slonik_1))',
      );
      expect(result.values).toEqual(["65"]);
    });

    it("should handle in operator", () => {
      const filter: BaseFilterInput = {
        key: "status",
        operator: "in",
        value: "active,inactive,pending",
        insensitive: true,
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain(
        'unaccent(lower("users"."status")) IN (unaccent(lower($slonik_1)), unaccent(lower($slonik_2)), unaccent(lower($slonik_3)))',
      );
      expect(result.values).toEqual(["active", "inactive", "pending"]);
    });

    it("should handle between operator", () => {
      const filter: BaseFilterInput = {
        key: "age",
        operator: "bt",
        value: "25,65",
        insensitive: true,
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain(
        'unaccent(lower("users"."age")) BETWEEN unaccent(lower($slonik_1)) AND unaccent(lower($slonik_2))',
      );
      expect(result.values).toEqual(["25", "65"]);
    });

    it("should convert camelCase keys to snake_case", () => {
      const filter: BaseFilterInput = {
        key: "firstName",
        operator: "eq",
        value: "John",
        insensitive: true,
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain(
        'unaccent(lower("users"."first_name")) = unaccent(lower($slonik_1))',
      );
      expect(result.values).toEqual(["John"]);
    });

    it("should handle schema.table identifiers", () => {
      const filter: BaseFilterInput = {
        key: "name",
        operator: "eq",
        value: "John",
        insensitive: true,
      };

      const result = applyFilter(mockSchemaTableIdentifier, filter);

      expect(result.sql).toContain(
        'unaccent(lower("public"."users"."name")) = unaccent(lower($slonik_1))',
      );
      expect(result.values).toEqual(["John"]);
    });

    // Join table / dotted key test cases
    describe("Join table scenarios (keys with dots)", () => {
      it("should handle simple join table key without table identifier", () => {
        const filter: BaseFilterInput = {
          key: "posts.title",
          operator: "eq",
          value: "My Post",
        };

        const result = applyFilter(mockTableIdentifier, filter);

        expect(result.sql).toContain('"posts"."title" = $slonik_');
        expect(result.values).toEqual(["My Post"]);
      });

      it("should handle join table key with camelCase conversion", () => {
        const filter: BaseFilterInput = {
          key: "userProfiles.firstName",
          operator: "eq",
          value: "John",
        };

        const result = applyFilter(mockTableIdentifier, filter);

        expect(result.sql).toContain('"user_profiles"."first_name" = $slonik_');
        expect(result.values).toEqual(["John"]);
      });

      it("should handle three-part join table key (schema.table.column)", () => {
        const filter: BaseFilterInput = {
          key: "public.posts.title",
          operator: "ct",
          value: "test",
        };

        const result = applyFilter(mockTableIdentifier, filter);

        expect(result.sql).toContain('"public"."posts"."title" ILIKE $slonik_');
        expect(result.values).toEqual(["%test%"]);
      });

      it("should handle join table key with complex operators", () => {
        const filter: BaseFilterInput = {
          key: "posts.createdAt",
          operator: "bt",
          value: "2023-01-01,2023-12-31",
        };

        const result = applyFilter(mockTableIdentifier, filter);

        expect(result.sql).toContain('"posts"."created_at" BETWEEN $slonik_');
        expect(result.values).toEqual(["2023-01-01", "2023-12-31"]);
      });

      it("should handle join table key with NOT flag", () => {
        const filter: BaseFilterInput = {
          key: "posts.status",
          operator: "in",
          value: "draft,archived",
          not: true,
        };

        const result = applyFilter(mockTableIdentifier, filter);

        expect(result.sql).toContain('"posts"."status" NOT IN ($slonik_');
        expect(result.values).toEqual(["draft", "archived"]);
      });

      it("should handle join table key with null values", () => {
        const filter: BaseFilterInput = {
          key: "posts.deletedAt",
          operator: "eq",
          value: "null",
        };

        const result = applyFilter(mockTableIdentifier, filter);

        expect(result.sql).toContain('"posts"."deleted_at" IS NULL');
        expect(result.values).toEqual([]);
      });

      it("should handle join table key with null values and NOT flag", () => {
        const filter: BaseFilterInput = {
          key: "comments.deletedAt",
          operator: "eq",
          value: "NULL",
          not: true,
        };

        const result = applyFilter(mockTableIdentifier, filter);

        expect(result.sql).toContain('"comments"."deleted_at" IS NOT NULL');
        expect(result.values).toEqual([]);
      });
    });
  });

  describe("applyFilter > edge cases", () => {
    it("should default to eq operator if not provided", () => {
      const filter = {
        key: "name",
        value: "John",
        operator: "eq",
      } as BaseFilterInput;

      const result = applyFilter(mockTableIdentifier, filter);
      expect(result.sql).toBe('"users"."name" = $slonik_1');
      expect(result.values).toEqual(["John"]);
    });

    it("should throw error for empty IN list", () => {
      const filter: BaseFilterInput = {
        key: "status",
        operator: "in",
        value: "",
      };

      expect(() => applyFilter(mockTableIdentifier, filter)).toThrow(
        "IN operator requires at least one value",
      );
    });

    it("should throw error for empty IN list with NOT", () => {
      const filter: BaseFilterInput = {
        key: "status",
        operator: "in",
        value: "",
        not: true,
      };

      expect(() => applyFilter(mockTableIdentifier, filter)).toThrow(
        "IN operator requires at least one value",
      );
    });

    it("should throw error for invalid BETWEEN values", () => {
      const filter: BaseFilterInput = {
        key: "age",
        operator: "bt",
        value: "18", // Missing second value
      };

      expect(() => applyFilter(mockTableIdentifier, filter)).toThrow(
        "BETWEEN operator requires exactly two values",
      );
    });

    it("should throw error for empty BETWEEN values", () => {
      const filter: BaseFilterInput = {
        key: "age",
        operator: "bt",
        value: "",
      };

      expect(() => applyFilter(mockTableIdentifier, filter)).toThrow(
        "BETWEEN operator requires exactly two values",
      );
    });
  });

  describe("applyFiltersToQuery", () => {
    it("should return empty fragment for empty AND array", () => {
      const filter: FilterInput = {
        AND: [],
      };

      const result = applyFiltersToQuery(filter, mockTableIdentifier);

      expect(result.sql).toBe("");
      expect(result.values).toEqual([]);
    });

    it("should return empty fragment for empty OR array", () => {
      const filter: FilterInput = {
        OR: [],
      };

      const result = applyFiltersToQuery(filter, mockTableIdentifier);

      expect(result.sql).toBe("");
      expect(result.values).toEqual([]);
    });

    // Dataset-based comprehensive tests
    describe("Comprehensive filter dataset tests", () => {
      const dataset = getFilterDataset();

      for (const testCase of dataset) {
        it(`should handle: ${testCase.name}`, () => {
          const result = applyFiltersToQuery(
            testCase.filter,
            mockTableIdentifier,
          );

          // Test SQL structure
          expect(result.sql).toMatch(testCase.expectedSQL);

          // Test parameter values
          expect(result.values).toEqual(testCase.expectedValues);
        });
      }
    });

    // Additional edge case tests
    it("should handle empty filter object gracefully", () => {
      const filter: FilterInput = {
        AND: [],
      };

      const result = applyFiltersToQuery(filter, mockTableIdentifier);
      expect(result.sql).toBe("");
      expect(result.values).toEqual([]);
    });

    it("should handle schema.table identifiers in complex queries", () => {
      const filter: FilterInput = {
        AND: [
          {
            key: "firstName",
            operator: "ct",
            value: "John",
          },
          {
            key: "lastName",
            operator: "sw",
            value: "Doe",
          },
        ],
      };

      const result = applyFiltersToQuery(filter, mockSchemaTableIdentifier);

      expect(result.sql).toContain(
        '"public"."users"."first_name" ILIKE $slonik_',
      );
      expect(result.sql).toContain(
        '"public"."users"."last_name" ILIKE $slonik_',
      );
      expect(result.values).toEqual(["%John%", "Doe%"]);
    });

    it("should handle mixed operators in complex nested structure", () => {
      const filter: FilterInput = {
        AND: [
          { key: "name", operator: "ct", value: "test" },
          {
            OR: [
              { key: "age", operator: "bt", value: "25,65" },
              { key: "status", operator: "in", value: "active,pending" },
            ],
          },
          { key: "deletedAt", operator: "eq", value: "null" },
        ],
      };

      const result = applyFiltersToQuery(filter, mockTableIdentifier);

      expect(result.sql).toContain('"users"."name" ILIKE $slonik_');
      expect(result.sql).toContain('"users"."age" BETWEEN $slonik_');
      expect(result.sql).toContain('"users"."status" IN ($slonik_');
      expect(result.sql).toContain('"users"."deleted_at" IS NULL');
      expect(result.values).toEqual([
        "%test%",
        "25",
        "65",
        "active",
        "pending",
      ]);
    });

    it("should validate parentheses placement for complex queries", () => {
      const filter: FilterInput = {
        OR: [
          {
            AND: [
              { key: "category", operator: "eq", value: "electronics" },
              { key: "price", operator: "lt", value: "100" },
            ],
          },
          {
            AND: [
              { key: "category", operator: "eq", value: "books" },
              { key: "inStock", operator: "eq", value: "true" },
            ],
          },
        ],
      };

      const result = applyFiltersToQuery(filter, mockTableIdentifier);

      // Verify proper grouping with parentheses
      expect(result.sql).toMatch(
        /WHERE \(\("users"\."category" = \$slonik_\d+ AND "users"\."price" < \$slonik_\d+\) OR \("users"\."category" = \$slonik_\d+ AND "users"\."in_stock" = \$slonik_\d+\)\)/,
      );
      expect(result.values).toEqual(["electronics", "100", "books", "true"]);
    });

    // Join table test cases for complex queries
    describe("Join table scenarios in complex queries", () => {
      it("should handle mixed regular and join table keys in AND operation", () => {
        const filter: FilterInput = {
          AND: [
            { key: "name", operator: "ct", value: "John" }, // regular key
            { key: "posts.title", operator: "sw", value: "My" }, // join table key
            { key: "status", operator: "eq", value: "active" }, // regular key
          ],
        };

        const result = applyFiltersToQuery(filter, mockTableIdentifier);

        expect(result.sql).toContain('"users"."name" ILIKE $slonik_');
        expect(result.sql).toContain('"posts"."title" ILIKE $slonik_');
        expect(result.sql).toContain('"users"."status" = $slonik_');
        expect(result.values).toEqual(["%John%", "My%", "active"]);
      });

      it("should handle mixed regular and join table keys in OR operation", () => {
        const filter: FilterInput = {
          OR: [
            { key: "email", operator: "ew", value: "@gmail.com" }, // regular key
            {
              key: "userProfiles.primaryEmail",
              operator: "ew",
              value: "@yahoo.com",
            }, // join table key
          ],
        };

        const result = applyFiltersToQuery(filter, mockTableIdentifier);

        expect(result.sql).toContain('"users"."email" ILIKE $slonik_');
        expect(result.sql).toContain(
          '"user_profiles"."primary_email" ILIKE $slonik_',
        );
        expect(result.values).toEqual(["%@gmail.com", "%@yahoo.com"]);
      });

      it("should handle complex nested structure with join table keys", () => {
        const filter: FilterInput = {
          AND: [
            { key: "status", operator: "eq", value: "active" }, // regular key
            {
              OR: [
                {
                  AND: [
                    { key: "posts.status", operator: "eq", value: "published" }, // join table key
                    { key: "posts.viewCount", operator: "gt", value: "100" }, // join table key
                  ],
                },
                {
                  key: "userProfiles.isVerified",
                  operator: "eq",
                  value: "true",
                }, // join table key
              ],
            },
          ],
        };

        const result = applyFiltersToQuery(filter, mockTableIdentifier);

        expect(result.sql).toContain('"users"."status" = $slonik_');
        expect(result.sql).toContain('"posts"."status" = $slonik_');
        expect(result.sql).toContain('"posts"."view_count" > $slonik_');
        expect(result.sql).toContain(
          '"user_profiles"."is_verified" = $slonik_',
        );
        expect(result.values).toEqual(["active", "published", "100", "true"]);
      });

      it("should handle three-part identifiers in complex queries", () => {
        const filter: FilterInput = {
          OR: [
            { key: "public.posts.title", operator: "ct", value: "tech" },
            { key: "public.comments.content", operator: "ct", value: "great" },
            { key: "name", operator: "eq", value: "admin" }, // regular key
          ],
        };

        const result = applyFiltersToQuery(filter, mockTableIdentifier);

        expect(result.sql).toContain('"public"."posts"."title" ILIKE $slonik_');
        expect(result.sql).toContain(
          '"public"."comments"."content" ILIKE $slonik_',
        );
        expect(result.sql).toContain('"users"."name" = $slonik_');
        expect(result.values).toEqual(["%tech%", "%great%", "admin"]);
      });

      it("should handle join table keys with all operators", () => {
        const filter: FilterInput = {
          AND: [
            { key: "posts.title", operator: "sw", value: "Blog" },
            {
              key: "posts.publishedAt",
              operator: "bt",
              value: "2023-01-01,2023-12-31",
            },
            {
              key: "comments.status",
              operator: "in",
              value: "approved,pending",
            },
            { key: "tags.name", operator: "ct", value: "javascript" },
            { key: "posts.deletedAt", operator: "eq", value: "null" },
          ],
        };

        const result = applyFiltersToQuery(filter, mockTableIdentifier);

        expect(result.sql).toContain('"posts"."title" ILIKE $slonik_');
        expect(result.sql).toContain('"posts"."published_at" BETWEEN $slonik_');
        expect(result.sql).toContain('"comments"."status" IN ($slonik_');
        expect(result.sql).toContain('"tags"."name" ILIKE $slonik_');
        expect(result.sql).toContain('"posts"."deleted_at" IS NULL');
        expect(result.values).toEqual([
          "Blog%",
          "2023-01-01",
          "2023-12-31",
          "approved",
          "pending",
          "%javascript%",
        ]);
      });

      it("should handle NOT flags with join table keys", () => {
        const filter: FilterInput = {
          AND: [
            {
              key: "posts.status",
              operator: "eq",
              value: "published",
              not: true,
            },
            {
              key: "comments.isSpam",
              operator: "eq",
              value: "true",
              not: true,
            },
            { key: "tags.isHidden", operator: "eq", value: "null", not: true },
          ],
        };

        const result = applyFiltersToQuery(filter, mockTableIdentifier);

        expect(result.sql).toContain('"posts"."status" != $slonik_');
        expect(result.sql).toContain('"comments"."is_spam" != $slonik_');
        expect(result.sql).toContain('"tags"."is_hidden" IS NOT NULL');
        expect(result.values).toEqual(["published", "true"]);
      });

      it("should handle deeply nested structure with mixed key types", () => {
        const filter: FilterInput = {
          OR: [
            {
              AND: [
                { key: "name", operator: "sw", value: "Admin" }, // regular key
                {
                  OR: [
                    { key: "posts.category", operator: "eq", value: "tech" }, // join table key
                    {
                      key: "userProfiles.department",
                      operator: "eq",
                      value: "engineering",
                    }, // join table key
                  ],
                },
              ],
            },
            {
              AND: [
                { key: "roles.name", operator: "eq", value: "moderator" }, // join table key
                { key: "verified", operator: "eq", value: "true" }, // regular key
              ],
            },
          ],
        };

        const result = applyFiltersToQuery(filter, mockTableIdentifier);

        expect(result.sql).toContain('"users"."name" ILIKE $slonik_');
        expect(result.sql).toContain('"posts"."category" = $slonik_');
        expect(result.sql).toContain('"user_profiles"."department" = $slonik_');
        expect(result.sql).toContain('"roles"."name" = $slonik_');
        expect(result.sql).toContain('"users"."verified" = $slonik_');
        expect(result.values).toEqual([
          "Admin%",
          "tech",
          "engineering",
          "moderator",
          "true",
        ]);
      });

      it("should handle single join table key without extra parentheses", () => {
        const filter: FilterInput = {
          AND: [{ key: "posts.title", operator: "eq", value: "My First Post" }],
        };

        const result = applyFiltersToQuery(filter, mockTableIdentifier);

        expect(result.sql).toMatch(/WHERE "posts"\."title" = \$slonik_\d+$/);
        expect(result.values).toEqual(["My First Post"]);
      });
    });
  });
});
