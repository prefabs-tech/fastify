import { describe, expect, it } from "vitest";

import { ROUTE_STRIPE_WEBHOOK } from "../constants";

describe("ROUTE_STRIPE_WEBHOOK", () => {
  it("defaults to /payment/webhook", () => {
    expect(ROUTE_STRIPE_WEBHOOK).toBe("/payment/webhook");
  });
});
