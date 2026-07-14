import { describe, expect, it } from "vitest";

import getOrigin from "../getOrigin";

describe.concurrent("getOrigin", () => {
  it.each([
    ["", ""],
    ["127.0.0.1", ""],
    ["127.0.0.1:3000", ""],
    ["example", ""],
    ["example.test", ""],
    ["localhost", ""],
    ["localhost:3000", ""],
    ["https://example.test", "https://example.test"],
    ["https://example.test:80", "https://example.test:80"],
    ["https://example.test:8080", "https://example.test:8080"],
    ["https://example.test/path", "https://example.test"],
    ["https://example.test:8080/path", "https://example.test:8080"],
    ["https://api.example.test", "https://api.example.test"],
    ["https://api.example.test:80", "https://api.example.test:80"],
    ["https://api.example.test:8080", "https://api.example.test:8080"],
    ["https://api.example.test/path", "https://api.example.test"],
    ["https://api.example.test:8080/path", "https://api.example.test:8080"],
    ["https://example.test", "https://example.test"],
    ["https://example.test:443", "https://example.test"],
    ["https://example.test:8080", "https://example.test:8080"],
    ["https://example.test/path", "https://example.test"],
    ["https://example.test:8080/path", "https://example.test:8080"],
    ["https://api.example.test", "https://api.example.test"],
    ["https://api.example.test:443", "https://api.example.test"],
    ["https://api.example.test:8080", "https://api.example.test:8080"],
    ["https://api.example.test/path", "https://api.example.test"],
    ["https://api.example.test:8080/path", "https://api.example.test:8080"],
  ])("getOrigin(url) -> origin", async (url, origin) => {
    expect(getOrigin(url)).toBe(origin);
  });
});
