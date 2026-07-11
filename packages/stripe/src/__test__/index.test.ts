import { describe, expect, it } from "vitest";

import * as packageExports from "../index";

describe("package exports", () => {
  it("re-exports ROUTE_STRIPE_WEBHOOK", () => {
    expect(packageExports.ROUTE_STRIPE_WEBHOOK).toBe("/payment/webhook");
  });

  it("re-exports StripeClient as a class", () => {
    expect(packageExports.StripeClient).toBeDefined();
    expect(typeof packageExports.StripeClient).toBe("function");
  });

  it("re-exports registerRawBodyParser", () => {
    expect(packageExports.registerRawBodyParser).toBeDefined();
    expect(typeof packageExports.registerRawBodyParser).toBe("function");
  });

  it("exposes the plugin as the default export", () => {
    expect(packageExports.default).toBeDefined();
    expect(typeof packageExports.default).toBe("function");
  });
});
