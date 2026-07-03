import Stripe from "stripe";
import { describe, expect, it } from "vitest";

import {
  getStripeErrorHttpStatus,
  isStripeError,
  stripeErrorHttpStatusMap,
  stripeErrorToHttpStatus,
} from "../utils/errors";

const rawError = {
  code: "card_declined",
  headers: { "request-id": "req_abc" },
  message: "test error",
  requestId: "req_abc",
  statusCode: 402,
  type: "card_error" as const,
};

describe("isStripeError", () => {
  it("returns true for a StripeError instance", () => {
    expect(isStripeError(new Stripe.errors.StripeError(rawError))).toBe(true);
  });

  it("returns true for a StripeCardError instance", () => {
    expect(isStripeError(new Stripe.errors.StripeCardError(rawError))).toBe(
      true,
    );
  });

  it("returns true for a StripeConnectionError instance", () => {
    expect(
      isStripeError(new Stripe.errors.StripeConnectionError(rawError)),
    ).toBe(true);
  });

  it("returns true for a TemporarySessionExpiredError instance", () => {
    expect(
      isStripeError(new Stripe.errors.TemporarySessionExpiredError(rawError)),
    ).toBe(true);
  });

  it("returns false for a plain Error", () => {
    expect(isStripeError(new Error("plain"))).toBe(false);
  });

  it("returns false for null", () => {
    // eslint-disable-next-line unicorn/no-null -- explicit null is part of the type-guard behavior being tested
    expect(isStripeError(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isStripeError()).toBe(false);
  });

  it("returns false for a string", () => {
    expect(isStripeError("oops")).toBe(false);
  });

  it("returns false for a number", () => {
    expect(isStripeError(42)).toBe(false);
  });

  it("returns false for a plain object", () => {
    expect(isStripeError({})).toBe(false);
  });
});

describe("stripeErrorHttpStatusMap", () => {
  it("maps StripeCardError to 402", () => {
    expect(stripeErrorHttpStatusMap.StripeCardError).toBe(402);
  });

  it("maps StripeInvalidRequestError to 400", () => {
    expect(stripeErrorHttpStatusMap.StripeInvalidRequestError).toBe(400);
  });

  it("maps StripeAuthenticationError to 401", () => {
    expect(stripeErrorHttpStatusMap.StripeAuthenticationError).toBe(401);
  });

  it("maps StripePermissionError to 403", () => {
    expect(stripeErrorHttpStatusMap.StripePermissionError).toBe(403);
  });

  it("maps StripeRateLimitError to 429", () => {
    expect(stripeErrorHttpStatusMap.StripeRateLimitError).toBe(429);
  });

  it("maps StripeIdempotencyError to 409", () => {
    expect(stripeErrorHttpStatusMap.StripeIdempotencyError).toBe(409);
  });

  it("maps StripeAPIError to 500", () => {
    expect(stripeErrorHttpStatusMap.StripeAPIError).toBe(500);
  });

  it("maps StripeConnectionError to 502", () => {
    expect(stripeErrorHttpStatusMap.StripeConnectionError).toBe(502);
  });

  it("maps StripeSignatureVerificationError to 400", () => {
    expect(stripeErrorHttpStatusMap.StripeSignatureVerificationError).toBe(400);
  });

  it("maps StripeInvalidGrantError to 400", () => {
    expect(stripeErrorHttpStatusMap.StripeInvalidGrantError).toBe(400);
  });

  it("maps TemporarySessionExpiredError to 400", () => {
    expect(stripeErrorHttpStatusMap.TemporarySessionExpiredError).toBe(400);
  });

  it("maps base StripeError to 500", () => {
    expect(stripeErrorHttpStatusMap.StripeError).toBe(500);
  });

  it("has a total of 12 entries", () => {
    expect(Object.keys(stripeErrorHttpStatusMap)).toHaveLength(12);
  });
});

describe("stripeErrorToHttpStatus", () => {
  it("returns 402 for StripeCardError", () => {
    expect(stripeErrorToHttpStatus("StripeCardError")).toBe(402);
  });

  it("returns 500 for unknown error types", () => {
    expect(stripeErrorToHttpStatus("BogusError")).toBe(500);
  });

  it("returns 500 for empty string", () => {
    expect(stripeErrorToHttpStatus("")).toBe(500);
  });
});

describe("getStripeErrorHttpStatus", () => {
  it("returns the error's own statusCode when present", () => {
    const error = new Stripe.errors.StripeError({
      ...rawError,
      statusCode: 400,
    });
    expect(getStripeErrorHttpStatus(error)).toBe(400);
  });

  it("falls back to type-based mapping when statusCode is undefined", () => {
    const error = new Stripe.errors.StripeRateLimitError({
      code: "rate_limit",
      headers: { "request-id": "req_abc" },
      message: "rate limited",
      requestId: "req_abc",
      statusCode: undefined,
      type: "rate_limit_error",
    });
    expect(getStripeErrorHttpStatus(error)).toBe(429);
  });

  it("falls back to 500 when type mapping is also missing", () => {
    const error = new Stripe.errors.StripeError({
      ...rawError,
      statusCode: undefined,
    });
    Object.defineProperty(error, "type", { value: "BogusError" });
    expect(getStripeErrorHttpStatus(error)).toBe(500);
  });
});
