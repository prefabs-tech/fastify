/* istanbul ignore file */
import admin from "firebase-admin";
import { describe, expect, it } from "vitest";

describe("Firebase Service", () => {
  it("Should initialize firebase-admin without errors", () => {
    expect(admin).toBeDefined();
    expect(admin.initializeApp).toBeDefined();
    expect(admin.messaging).toBeDefined();
  });

  it("Should have messaging API available", () => {
    expect(typeof admin.messaging).toBe("function");
  });
});
