import { describe, expect, it } from "vitest";

import { ROUTE_STRIPE_WEBHOOK } from "../constants";

describe("constants", () => {
  it("ROUTE_STRIPE_WEBHOOK is /payment/webhook", () => {
    expect(ROUTE_STRIPE_WEBHOOK).toBe("/payment/webhook");
  });
});
