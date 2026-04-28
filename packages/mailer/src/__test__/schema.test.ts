import { describe, expect, it } from "vitest";

import { testEmailSchema } from "../schema";

describe("testEmailSchema", () => {
  it("tags the test email route for OpenAPI tools", () => {
    expect(testEmailSchema.tags).toEqual(["email"]);
  });

  it("documents a summary for the test email route", () => {
    expect(testEmailSchema.summary).toBe("Test email");
  });

  it("requires status, message, and info on successful responses", () => {
    const ok = testEmailSchema.response[200];
    expect(ok.required).toEqual(["status", "message", "info"]);
  });
});
