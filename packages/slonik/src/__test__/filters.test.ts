import type { IdentifierSqlToken } from "slonik";

import { sql } from "slonik";
import { describe, expect, it } from "vitest";

import type { BaseFilterInput, FilterInput } from "../types";

import {
  applyFilter,
  applyFiltersToQuery,
  buildFilterFragment,
} from "../filters";

// Comprehensive dataset of filter combinations for testing
const getFilterDataset = (): Array<{
  description: string;
  expectedSQL: RegExp;
  expectedValues: string[];
  filter: FilterInput;
  name: string;
}> => {
  return [
    {
      description: "Basic equality operation",
      expectedSQL: /WHERE "users"\."name" = \$slonik_\d+$/,
      expectedValues: ["test"],
      filter: { key: "name", operator: "eq", value: "test" },
      name: "Simple equality filter",
    },
    {
      description: "Starts with operation",
      expectedSQL: /WHERE "users"\."name" ILIKE \$slonik_\d+$/,
      expectedValues: ["test%"],
      filter: { key: "name", operator: "sw", value: "test" },
      name: "Simple starts with filter",
    },
    {
      description: "Simple AND with two conditions",
      expectedSQL:
        /WHERE \("users"\."name" ILIKE \$slonik_\d+ AND "users"\."age" > \$slonik_\d+\)/,
      expectedValues: ["test%", "25"],
      filter: {
        AND: [
          { key: "name", operator: "sw", value: "test" },
          { key: "age", operator: "gt", value: "25" },
        ],
      },
      name: "Simple AND operation",
    },
    {
      description: "Simple OR with two conditions",
      expectedSQL:
        /WHERE \("users"\."name" ILIKE \$slonik_\d+ OR "users"\."name" ILIKE \$slonik_\d+\)/,
      expectedValues: ["Test%", "%t1"],
      filter: {
        OR: [
          { key: "name", operator: "sw", value: "Test" },
          { key: "name", operator: "ew", value: "t1" },
        ],
      },
      name: "Simple OR operation",
    },
    {
      description: "AND containing OR - tests proper nesting",
      expectedSQL:
        /WHERE \("users"\."id" > \$slonik_\d+ AND \("users"\."name" ILIKE \$slonik_\d+ OR "users"\."name" ILIKE \$slonik_\d+\)\)/,
      expectedValues: ["10", "Test%", "%t1"],
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
      name: "AND with nested OR",
    },
    {
      description: "OR containing AND - tests proper nesting",
      expectedSQL:
        /WHERE \("users"\."id" > \$slonik_\d+ OR \("users"\."name" ILIKE \$slonik_\d+ AND "users"\."name" ILIKE \$slonik_\d+\)\)/,
      expectedValues: ["10", "Test%", "%t1"],
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
      name: "OR with nested AND",
    },
    {
      description: "OR with multiple AND blocks - tests complex grouping",
      expectedSQL:
        /WHERE \(\("users"\."name" ILIKE \$slonik_\d+ AND "users"\."age" > \$slonik_\d+\) OR \("users"\."email" ILIKE \$slonik_\d+ AND "users"\."status" = \$slonik_\d+\)\)/,
      expectedValues: ["Test%", "25", "%@test.com", "active"],
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
      name: "OR with multiple AND blocks",
    },
    {
      description: "Deep nesting: OR[AND[condition, OR[...]], AND[...]]",
      expectedSQL:
        /WHERE \(\("users"\."name" ILIKE \$slonik_\d+ AND \("users"\."department" = \$slonik_\d+ OR "users"\."department" = \$slonik_\d+\)\) OR \("users"\."role" = \$slonik_\d+ AND "users"\."verified" = \$slonik_\d+\)\)/,
      expectedValues: ["Test%", "engineering", "design", "admin", "true"],
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
      name: "Complex nested structure",
    },
    {
      description: "Triple nesting: AND[condition, OR[AND[...], OR[...]]]",
      expectedSQL:
        /WHERE \("users"\."status" = \$slonik_\d+ AND \(\("users"\."age" >= \$slonik_\d+ AND "users"\."age" <= \$slonik_\d+\) OR \("users"\."role" = \$slonik_\d+ OR "users"\."special" = \$slonik_\d+\)\)\)/,
      expectedValues: ["active", "18", "65", "admin", "true"],
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
      name: "Triple nested structure",
    },
    {
      description: "Single condition should not have extra parentheses",
      expectedSQL: /WHERE "users"\."name" = \$slonik_\d+$/,
      expectedValues: ["test"],
      filter: {
        AND: [{ key: "name", operator: "eq", value: "test" }],
      },
      name: "Single condition in AND array",
    },
    {
      description: "Single condition should not have extra parentheses",
      expectedSQL: /WHERE "users"\."status" = \$slonik_\d+$/,
      expectedValues: ["active"],
      filter: {
        OR: [{ key: "status", operator: "eq", value: "active" }],
      },
      name: "Single condition in OR array",
    },
    {
      description: "Tests all different operators",
      expectedSQL:
        /WHERE \("users"\."name" ILIKE \$slonik_\d+ AND "users"\."age" BETWEEN \$slonik_\d+ AND \$slonik_\d+ AND "users"\."status" IN \(\$slonik_\d+, \$slonik_\d+\) AND "users"\."deleted_at" IS NULL\)/,
      expectedValues: ["%test%", "25", "65", "active", "pending"],
      filter: {
        AND: [
          { key: "name", operator: "ct", value: "test" },
          { key: "age", operator: "bt", value: "25,65" },
          { key: "status", operator: "in", value: "active,pending" },
          { key: "deletedAt", operator: "eq", value: "null" },
        ],
      },
      name: "Multiple operators test",
    },
    {
      description: "Tests NOT flag with different operators",
      expectedSQL:
        /WHERE \("users"\."name" != \$slonik_\d+ AND "users"\."status" NOT IN \(\$slonik_\d+, \$slonik_\d+\)\)/,
      expectedValues: ["test", "inactive", "banned"],
      filter: {
        AND: [
          { key: "name", not: true, operator: "eq", value: "test" },
          {
            key: "status",
            not: true,
            operator: "in",
            value: "inactive,banned",
          },
        ],
      },
      name: "NOT flag operations",
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
        not: true,
        operator: "eq",
        value: "John",
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
        not: true,
        operator: "eq",
        value: "NULL",
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
          not: true,
          operator: "in",
          value: "draft,archived",
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
          not: true,
          operator: "eq",
          value: "NULL",
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
        insensitive: true,
        key: "name",
        operator: "eq",
        value: "John",
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain(
        'unaccent(lower("users"."name")) = unaccent(lower($slonik_1))',
      );
      expect(result.values).toEqual(["John"]);
    });

    it("should handle equality operator with not flag", () => {
      const filter: BaseFilterInput = {
        insensitive: true,
        key: "name",
        not: true,
        operator: "eq",
        value: "John",
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain(
        'unaccent(lower("users"."name")) != unaccent(lower($slonik_1))',
      );
      expect(result.values).toEqual(["John"]);
    });

    it("should handle null values", () => {
      const filter: BaseFilterInput = {
        insensitive: true,
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
        insensitive: true,
        key: "deletedAt",
        not: true,
        operator: "eq",
        value: "NULL",
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain('"users"."deleted_at" IS NOT NULL');
      expect(result.values).toEqual([]);
    });

    it("should handle contains operator", () => {
      const filter: BaseFilterInput = {
        insensitive: true,
        key: "name",
        operator: "ct",
        value: "John",
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain(
        'unaccent(lower("users"."name")) ILIKE unaccent(lower($slonik_1))',
      );
      expect(result.values).toEqual(["%John%"]);
    });

    it("should handle starts with operator", () => {
      const filter: BaseFilterInput = {
        insensitive: true,
        key: "name",
        operator: "sw",
        value: "John",
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain(
        'unaccent(lower("users"."name")) ILIKE unaccent(lower($slonik_1))',
      );
      expect(result.values).toEqual(["John%"]);
    });

    it("should handle ends with operator", () => {
      const filter: BaseFilterInput = {
        insensitive: true,
        key: "name",
        operator: "ew",
        value: "son",
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain(
        'unaccent(lower("users"."name")) ILIKE unaccent(lower($slonik_1))',
      );
      expect(result.values).toEqual(["%son"]);
    });

    it("should handle greater than operator", () => {
      const filter: BaseFilterInput = {
        insensitive: true,
        key: "age",
        operator: "gt",
        value: "25",
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain(
        'unaccent(lower("users"."age")) > unaccent(lower($slonik_1))',
      );
      expect(result.values).toEqual(["25"]);
    });

    it("should handle greater than or equal operator", () => {
      const filter: BaseFilterInput = {
        insensitive: true,
        key: "age",
        operator: "gte",
        value: "25",
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain(
        'unaccent(lower("users"."age")) >= unaccent(lower($slonik_1))',
      );
      expect(result.values).toEqual(["25"]);
    });

    it("should handle less than operator", () => {
      const filter: BaseFilterInput = {
        insensitive: true,
        key: "age",
        operator: "lt",
        value: "65",
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain(
        'unaccent(lower("users"."age")) < unaccent(lower($slonik_1))',
      );
      expect(result.values).toEqual(["65"]);
    });

    it("should handle less than or equal operator", () => {
      const filter: BaseFilterInput = {
        insensitive: true,
        key: "age",
        operator: "lte",
        value: "65",
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain(
        'unaccent(lower("users"."age")) <= unaccent(lower($slonik_1))',
      );
      expect(result.values).toEqual(["65"]);
    });

    it("should handle in operator", () => {
      const filter: BaseFilterInput = {
        insensitive: true,
        key: "status",
        operator: "in",
        value: "active,inactive,pending",
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain(
        'unaccent(lower("users"."status")) IN (unaccent(lower($slonik_1)), unaccent(lower($slonik_2)), unaccent(lower($slonik_3)))',
      );
      expect(result.values).toEqual(["active", "inactive", "pending"]);
    });

    it("should handle between operator", () => {
      const filter: BaseFilterInput = {
        insensitive: true,
        key: "age",
        operator: "bt",
        value: "25,65",
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain(
        'unaccent(lower("users"."age")) BETWEEN unaccent(lower($slonik_1)) AND unaccent(lower($slonik_2))',
      );
      expect(result.values).toEqual(["25", "65"]);
    });

    it("should convert camelCase keys to snake_case", () => {
      const filter: BaseFilterInput = {
        insensitive: true,
        key: "firstName",
        operator: "eq",
        value: "John",
      };

      const result = applyFilter(mockTableIdentifier, filter);

      expect(result.sql).toContain(
        'unaccent(lower("users"."first_name")) = unaccent(lower($slonik_1))',
      );
      expect(result.values).toEqual(["John"]);
    });

    it("should handle schema.table identifiers", () => {
      const filter: BaseFilterInput = {
        insensitive: true,
        key: "name",
        operator: "eq",
        value: "John",
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
          not: true,
          operator: "in",
          value: "draft,archived",
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
          not: true,
          operator: "eq",
          value: "NULL",
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
        operator: "eq",
        value: "John",
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
        not: true,
        operator: "in",
        value: "",
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
              not: true,
              operator: "eq",
              value: "published",
            },
            {
              key: "comments.isSpam",
              not: true,
              operator: "eq",
              value: "true",
            },
            { key: "tags.isHidden", not: true, operator: "eq", value: "null" },
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

describe("applyFilter — dwithin operator", () => {
  const mockTableIdentifier: IdentifierSqlToken = sql.identifier(["locations"]);

  it("generates ST_DWithin SQL with lat, lng, radius from value string", () => {
    const filter: BaseFilterInput = {
      key: "coordinates",
      operator: "dwithin",
      value: "48.8566,2.3522,1000",
    };

    const result = applyFilter(mockTableIdentifier, filter);

    expect(result.sql).toMatch(/ST_DWithin/);
    expect(result.sql).toMatch(/ST_SetSRID/);
    expect(result.sql).toMatch(/ST_MakePoint/);
  });

  it("places longitude before latitude in ST_MakePoint (GeoJSON order)", () => {
    const filter: BaseFilterInput = {
      key: "coordinates",
      operator: "dwithin",
      value: "48.8566,2.3522,500",
    };

    const result = applyFilter(mockTableIdentifier, filter);

    // ST_MakePoint(longitude, latitude) — values[0]=lng=2.3522, values[1]=lat=48.8566
    expect(result.values).toContain("2.3522");
    expect(result.values).toContain("48.8566");
  });

  it("includes the radius value", () => {
    const filter: BaseFilterInput = {
      key: "coordinates",
      operator: "dwithin",
      value: "40.7128,-74.0060,5000",
    };

    const result = applyFilter(mockTableIdentifier, filter);
    expect(result.values).toContain("5000");
  });
});

describe("buildFilterFragment — empty input paths", () => {
  const mockTableIdentifier: IdentifierSqlToken = sql.identifier(["users"]);

  it("returns undefined for empty AND array", () => {
    const result = buildFilterFragment({ AND: [] }, mockTableIdentifier);
    expect(result).toBeUndefined();
  });

  it("returns undefined for empty OR array", () => {
    const result = buildFilterFragment({ OR: [] }, mockTableIdentifier);
    expect(result).toBeUndefined();
  });

  it("returns single fragment directly when AND has one item (no extra parens)", () => {
    const result = buildFilterFragment(
      { AND: [{ key: "name", operator: "eq", value: "alice" }] },
      mockTableIdentifier,
    );
    expect(result?.sql).not.toMatch(/^\(/);
    expect(result?.sql).toMatch(/"users"\."name"/);
  });

  it("returns single fragment directly when OR has one item (no extra parens)", () => {
    const result = buildFilterFragment(
      { OR: [{ key: "name", operator: "eq", value: "alice" }] },
      mockTableIdentifier,
    );
    expect(result?.sql).not.toMatch(/^\(/);
    expect(result?.sql).toMatch(/"users"\."name"/);
  });

  it("returns undefined for null/undefined filter", () => {
    const result = buildFilterFragment(
      // eslint-disable-next-line unicorn/no-null
      null as unknown as FilterInput,
      mockTableIdentifier,
    );
    expect(result).toBeUndefined();
  });
});
