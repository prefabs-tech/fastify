import type { ApiConfig } from "@prefabs.tech/fastify-config";

import "../index";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StripeConfig } from "../types";

import createStripeConfig from "./helpers/createStripeConfig";

const buildApiConfig = (
  stripeOverrides: Partial<StripeConfig> = {},
): ApiConfig =>
  ({ stripe: createStripeConfig(stripeOverrides) }) as unknown as ApiConfig;

const { promotionCodesListMock, sessionsCreateMock, stripeMock } = vi.hoisted(
  () => {
    const sessionsCreateMock = vi.fn();
    const promotionCodesListMock = vi.fn();
    const stripeMock = vi.fn().mockImplementation(() => ({
      checkout: { sessions: { create: sessionsCreateMock } },
      promotionCodes: { list: promotionCodesListMock },
      webhooks: { constructEvent: vi.fn() },
    }));
    return { promotionCodesListMock, sessionsCreateMock, stripeMock };
  },
);

vi.mock("stripe", () => ({ default: stripeMock }));

describe("StripeClient — constructor", async () => {
  const { default: StripeClient } = await import("../utils/stripeClient");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("instantiates the Stripe SDK with apiKey and clientConfig", () => {
    const clientConfig = { apiVersion: "2025-12-15.clover" as const };
    new StripeClient(buildApiConfig({ apiKey: "sk_custom", clientConfig }));

    expect(stripeMock).toHaveBeenCalledTimes(1);
    expect(stripeMock).toHaveBeenCalledWith("sk_custom", clientConfig);
  });

  it("forwards clientConfig unmodified (undefined when not set)", () => {
    new StripeClient(buildApiConfig());

    expect(stripeMock).toHaveBeenCalledWith(
      "sk_test_dummy",
      undefined as unknown as undefined,
    );
  });

  it("exposes the raw Stripe SDK instance via client.stripe", () => {
    const client = new StripeClient(buildApiConfig());

    expect(client.stripe).toBeDefined();
    expect(client.stripe.checkout.sessions.create).toBe(sessionsCreateMock);
  });
});

describe("StripeClient — createCheckoutSession synthesis", async () => {
  const { default: StripeClient } = await import("../utils/stripeClient");

  beforeEach(() => {
    vi.clearAllMocks();
    sessionsCreateMock.mockResolvedValue({ id: "cs_test" });
  });

  const buildClient = (stripeOverrides: Partial<StripeConfig> = {}) =>
    new StripeClient(buildApiConfig(stripeOverrides));

  it("builds exactly one line_items entry from productName, unitAmount, quantity, and currency", async () => {
    const client = buildClient();
    await client.createCheckoutSession({
      currency: "eur",
      productName: "Hat",
      quantity: 3,
      unitAmount: 1500,
    });

    const arguments_ = sessionsCreateMock.mock.calls[0][0];
    expect(arguments_.line_items).toHaveLength(1);
    expect(arguments_.line_items[0]).toEqual({
      price_data: {
        currency: "eur",
        product_data: { name: "Hat" },
        unit_amount: 1500,
      },
      quantity: 3,
    });
  });

  it("defaults quantity to 1 when input.quantity is unset", async () => {
    const client = buildClient();
    await client.createCheckoutSession({
      productName: "Hat",
      unitAmount: 1500,
    });

    expect(sessionsCreateMock.mock.calls[0][0].line_items[0].quantity).toBe(1);
  });

  it("defaults mode to 'payment' when input.mode is unset", async () => {
    const client = buildClient();
    await client.createCheckoutSession({
      productName: "Hat",
      unitAmount: 1500,
    });

    expect(sessionsCreateMock.mock.calls[0][0].mode).toBe("payment");
  });

  it("forwards input.mode when set", async () => {
    const client = buildClient();
    await client.createCheckoutSession({
      mode: "subscription",
      productName: "Plan",
      unitAmount: 999,
    });

    expect(sessionsCreateMock.mock.calls[0][0].mode).toBe("subscription");
  });

  it("defaults currency to config.stripe.defaultCurrency when input.currency is unset", async () => {
    const client = buildClient({ defaultCurrency: "gbp" });
    await client.createCheckoutSession({
      productName: "Hat",
      unitAmount: 1500,
    });

    expect(
      sessionsCreateMock.mock.calls[0][0].line_items[0].price_data.currency,
    ).toBe("gbp");
  });

  it("defaults success_url to config.stripe.urls.success when input.successUrl is unset", async () => {
    const client = buildClient({
      urls: {
        cancel: "https://example.com/cancel",
        success: "https://example.com/configured-success",
      },
    });
    await client.createCheckoutSession({
      productName: "Hat",
      unitAmount: 1500,
    });

    expect(sessionsCreateMock.mock.calls[0][0].success_url).toBe(
      "https://example.com/configured-success",
    );
  });

  it("uses input.successUrl when provided", async () => {
    const client = buildClient();
    await client.createCheckoutSession({
      productName: "Hat",
      successUrl: "https://override.example/success",
      unitAmount: 1500,
    });

    expect(sessionsCreateMock.mock.calls[0][0].success_url).toBe(
      "https://override.example/success",
    );
  });

  it("defaults cancel_url to config.stripe.urls.cancel when input.cancelUrl is unset", async () => {
    const client = buildClient({
      urls: {
        cancel: "https://example.com/configured-cancel",
        success: "https://example.com/success",
      },
    });
    await client.createCheckoutSession({
      productName: "Hat",
      unitAmount: 1500,
    });

    expect(sessionsCreateMock.mock.calls[0][0].cancel_url).toBe(
      "https://example.com/configured-cancel",
    );
  });

  it("uses input.cancelUrl when provided", async () => {
    const client = buildClient();
    await client.createCheckoutSession({
      cancelUrl: "https://override.example/cancel",
      productName: "Hat",
      unitAmount: 1500,
    });

    expect(sessionsCreateMock.mock.calls[0][0].cancel_url).toBe(
      "https://override.example/cancel",
    );
  });

  it("forwards config.stripe.allowPromotionCodes as allow_promotion_codes", async () => {
    const client = buildClient({ allowPromotionCodes: true });
    await client.createCheckoutSession({
      productName: "Hat",
      unitAmount: 1500,
    });

    expect(sessionsCreateMock.mock.calls[0][0].allow_promotion_codes).toBe(
      true,
    );
  });

  it("passes allow_promotion_codes as undefined when allowPromotionCodes is unset", async () => {
    const client = buildClient();
    await client.createCheckoutSession({
      productName: "Hat",
      unitAmount: 1500,
    });

    expect(
      sessionsCreateMock.mock.calls[0][0].allow_promotion_codes,
    ).toBeUndefined();
  });

  it("writes metadata onto both session.metadata and payment_intent_data.metadata for payment mode", async () => {
    const client = buildClient();
    const metadata = { orderId: "ord_123", userId: "u_42" };
    await client.createCheckoutSession(
      { productName: "Hat", unitAmount: 1500 },
      metadata,
    );

    const arguments_ = sessionsCreateMock.mock.calls[0][0];
    expect(arguments_.metadata).toEqual(metadata);
    expect(arguments_.payment_intent_data.metadata).toEqual(metadata);
    expect(arguments_.subscription_data).toBeUndefined();
    expect(arguments_.setup_intent_data).toBeUndefined();
  });

  it("metadata is undefined on both session and payment_intent_data placements when not provided", async () => {
    const client = buildClient();
    await client.createCheckoutSession({
      productName: "Hat",
      unitAmount: 1500,
    });

    const arguments_ = sessionsCreateMock.mock.calls[0][0];
    expect(arguments_.metadata).toBeUndefined();
    expect(arguments_.payment_intent_data.metadata).toBeUndefined();
  });

  it("routes metadata to subscription_data and omits payment_intent_data for subscription mode", async () => {
    const client = buildClient();
    const metadata = { plan: "annual", userId: "u_42" };
    await client.createCheckoutSession(
      { mode: "subscription", productName: "Plan", unitAmount: 9900 },
      metadata,
    );

    const arguments_ = sessionsCreateMock.mock.calls[0][0];
    expect(arguments_.metadata).toEqual(metadata);
    expect(arguments_.subscription_data.metadata).toEqual(metadata);
    expect(arguments_.payment_intent_data).toBeUndefined();
    expect(arguments_.setup_intent_data).toBeUndefined();
  });

  it("routes metadata to setup_intent_data and omits payment_intent_data for setup mode", async () => {
    const client = buildClient();
    const metadata = { customerId: "cus_123" };
    await client.createCheckoutSession(
      { mode: "setup", productName: "Card setup", unitAmount: 0 },
      metadata,
    );

    const arguments_ = sessionsCreateMock.mock.calls[0][0];
    expect(arguments_.metadata).toEqual(metadata);
    expect(arguments_.setup_intent_data.metadata).toEqual(metadata);
    expect(arguments_.payment_intent_data).toBeUndefined();
    expect(arguments_.subscription_data).toBeUndefined();
  });

  it("returns the session returned by stripe.checkout.sessions.create", async () => {
    const sessionResponse = { id: "cs_returned", url: "https://stripe.test" };
    sessionsCreateMock.mockResolvedValueOnce(sessionResponse);
    const client = buildClient();

    const result = await client.createCheckoutSession({
      productName: "Hat",
      unitAmount: 1500,
    });

    expect(result).toBe(sessionResponse);
  });
});

describe("StripeClient — getActivePromotionCode", async () => {
  const { default: StripeClient } = await import("../utils/stripeClient");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const buildClient = () => new StripeClient(buildApiConfig());

  it("calls stripe.promotionCodes.list with { active: true, code }", async () => {
    promotionCodesListMock.mockResolvedValue({ data: [] });
    const client = buildClient();

    await client.getActivePromotionCode("SUMMER10");

    expect(promotionCodesListMock).toHaveBeenCalledWith({
      active: true,
      code: "SUMMER10",
    });
  });

  it("returns the first matching promotion code when results exist", async () => {
    const promo = { active: true, code: "SUMMER10", id: "promo_1" };
    promotionCodesListMock.mockResolvedValue({
      data: [promo, { id: "promo_2" }],
    });

    const client = buildClient();
    const result = await client.getActivePromotionCode("SUMMER10");

    expect(result).toBe(promo);
  });

  it("returns undefined when no promotion code matches", async () => {
    promotionCodesListMock.mockResolvedValue({ data: [] });
    const client = buildClient();

    const result = await client.getActivePromotionCode("UNKNOWN");

    expect(result).toBeUndefined();
  });
});
