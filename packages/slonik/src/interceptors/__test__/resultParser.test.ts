import { SchemaValidationError } from "slonik";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import resultParser from "../resultParser";
import createQueryContext from "./helpers/createQueryContext";

const fakeQuery = { sql: "SELECT 1", values: [] };
const fakeFields = [{ dataTypeId: 1, name: "id" }];

const contextWithParser = (schema: z.ZodTypeAny) => ({
  ...createQueryContext(),
  resultParser: schema,
});

describe("resultParser interceptor", () => {
  const { transformRow } = resultParser;

  if (!transformRow) throw new Error("transformRow must be defined");

  it("returns row unchanged when queryContext has no resultParser", () => {
    const row = { id: 1, name: "Alice" };
    const result = transformRow(
      createQueryContext(),
      fakeQuery,
      row,
      fakeFields,
    );
    expect(result).toBe(row);
  });

  it("returns parsed data when zod schema passes validation", () => {
    const schema = z.object({ id: z.number(), name: z.string() });
    const row = { id: 1, name: "Alice" };
    const result = transformRow(
      contextWithParser(schema),
      fakeQuery,
      row,
      fakeFields,
    );
    expect(result).toEqual({ id: 1, name: "Alice" });
  });

  it("throws SchemaValidationError when zod schema fails validation", () => {
    const schema = z.object({ id: z.number() });
    const row = { id: "not-a-number" };

    expect(() =>
      transformRow(contextWithParser(schema), fakeQuery, row, fakeFields),
    ).toThrow(SchemaValidationError);
  });

  it("does not mutate the original row when validation passes", () => {
    const schema = z.object({ id: z.number() });
    const row = { id: 1 };
    const original = { ...row };
    transformRow(contextWithParser(schema), fakeQuery, row, fakeFields);
    expect(row).toEqual(original);
  });
});
