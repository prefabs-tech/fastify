import { describe, expect, it } from "vitest";

import {
  getStripeErrorHttpStatus,
  isStripeError,
  stripeErrorHttpStatusMap,
  stripeErrorToHttpStatus,
} from "../utils/errors";

const makeError = (overrides: Record<string, unknown> = {}) => {
  const error = new Error("test error") as Record<string, unknown>;
  error.type = "StripeCardError";
  error.headers = { "request-id": "req_abc" };
  error.requestId = "req_abc";
  error.statusCode = 402;
  error.code = "card_declined";
  error.rawType = "card_error";

  Object.assign(error, overrides);

  return error;
};

describe("isStripeError", () => {
  it("returns true for a valid StripeError-like object", () => {
    expect(isStripeError(makeError())).toBe(true);
  });

  it("returns false for a plain Error", () => {
    expect(isStripeError(new Error("plain"))).toBe(false);
  });

  it("returns false for null", () => {
    // eslint-disable-next-line unicorn/no-null
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

  it("returns false for an object without type starting with Stripe", () => {
    expect(isStripeError(makeError({ type: "SomeError" }))).toBe(false);
  });

  it("returns false for an object missing headers", () => {
    expect(isStripeError(makeError({ headers: undefined }))).toBe(false);
  });

  it("returns false for an object missing requestId", () => {
    expect(isStripeError(makeError({ requestId: undefined }))).toBe(false);
  });

  it("returns true for StripeInvalidRequestError", () => {
    expect(
      isStripeError(
        makeError({
          code: "missing",
          rawType: "invalid_request_error",
          type: "StripeInvalidRequestError",
        }),
      ),
    ).toBe(true);
  });

  it("returns true for StripeRateLimitError", () => {
    expect(
      isStripeError(
        makeError({
          code: "rate_limit",
          rawType: "rate_limit_error",
          type: "StripeRateLimitError",
        }),
      ),
    ).toBe(true);
  });

  it("returns true for StripeAuthenticationError", () => {
    expect(
      isStripeError(
        makeError({
          code: "authentication_required",
          rawType: "authentication_error",
          type: "StripeAuthenticationError",
        }),
      ),
    ).toBe(true);
  });

  it("returns true for StripeConnectionError", () => {
    expect(
      isStripeError(
        makeError({
          code: "connection_error",
          type: "StripeConnectionError",
        }),
      ),
    ).toBe(true);
  });

  it("returns true for TemporarySessionExpiredError (type does not start with 'Stripe')", () => {
    expect(
      isStripeError(
        makeError({
          code: "temporary_session_expired",
          rawType: "temporary_session_expired",
          type: "TemporarySessionExpiredError",
        }),
      ),
    ).toBe(true);
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
    const error = makeError({ statusCode: 400 });
    expect(getStripeErrorHttpStatus(error as never)).toBe(400);
  });

  it("falls back to type-based mapping when statusCode is undefined", () => {
    const error = makeError({
      statusCode: undefined,
      type: "StripeRateLimitError",
    });
    expect(getStripeErrorHttpStatus(error as never)).toBe(429);
  });

  it("falls back to 500 when both statusCode and type mapping are missing", () => {
    const error = makeError({
      statusCode: undefined,
      type: "BogusError",
    });
    expect(getStripeErrorHttpStatus(error as never)).toBe(500);
  });
});
