/* istanbul ignore file */
import { describe, expect, it } from "vitest";

import parse from "../parse";

describe("parse", () => {
  it("parses a boolean", () => {
    expect(parse("false", false)).toBe(false);
  });

  it("parses a number", () => {
    expect(parse("23", 1)).toBe(23);
  });

  it("parses a number as a string", () => {
    expect(parse("23", "abc")).toBe("23");
  });

  it("parses 'false' as a string", () => {
    expect(parse("false", "abc")).toBe("false");
  });

  it("returns the fallback value as a boolean", () => {
    expect(parse(undefined, true)).toBe(true);
  });

  it("returns the fallback value as a number", () => {
    expect(parse(undefined, 123)).toBe(123);
  });

  it("returns the fallback value as a string", () => {
    expect(parse(undefined, "abc")).toBe("abc");
  });

  it("returns undefined", () => {
    // eslint-disable-next-line unicorn/no-useless-undefined
    expect(parse(undefined, undefined)).toBe(undefined);
  });

  it("throws SyntaxError when boolean parsing receives invalid JSON", () => {
    expect(() => parse("Dzango", false)).toThrow(SyntaxError);
  });

  it("throws SyntaxError when number parsing receives invalid JSON", () => {
    expect(() => parse("Dzango", 14)).toThrow(SyntaxError);
  });

  it('parses "1" as truthy boolean', () => {
    expect(parse("1", false)).toBe(true);
  });

  it('parses "0" as falsy boolean', () => {
    expect(parse("0", true)).toBe(false);
  });

  it("parses a float number", () => {
    expect(parse("3.14", 0)).toBe(3.14);
  });

  it("parses a negative number", () => {
    expect(parse("-5", 0)).toBe(-5);
  });

  it("returns empty string when value is empty string", () => {
    expect(parse("", "default")).toBe("");
  });
});
