import { describe, expect, it } from "vitest";

import { createBigintTypeParser } from "../createBigintTypeParser";

describe("createBigintTypeParser", () => {
  it("returns a type parser with name int8", () => {
    const parser = createBigintTypeParser();
    expect(parser.name).toBe("int8");
  });

  it("parse converts a bigint string to a number", () => {
    const { parse } = createBigintTypeParser();
    expect(parse("42")).toBe(42);
  });

  it("parse handles large-but-safe integer strings", () => {
    const { parse } = createBigintTypeParser();
    expect(parse(String(Number.MAX_SAFE_INTEGER))).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });

  it("parse returns an integer, not a float", () => {
    const { parse } = createBigintTypeParser();
    const result = parse("100");
    expect(Number.isInteger(result)).toBe(true);
  });
});
