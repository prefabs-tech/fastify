import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApiConfig } from "@prefabs.tech/fastify-config";

vi.mock("stripe", () => ({
  default: vi.fn(),
}));

describe("StripeClient", async () => {
  const { default: Stripe } = await import("stripe");
  const { default: StripeClient } = await import("../utils/stripeClient");

  const mockSessionsCreate = vi.fn();
  const mockPromotionCodesList = vi.fn();

  const stripeSection = {
    allowPromotionCodes: true,
    apiKey: "sk_test_client",
    clientConfig: { maxNetworkRetries: 2 },
    defaultCurrency: "usd",
    enablePaymentWebhook: false,
    urls: {
      cancel: "http://cancel.test",
      success: "http://success.test",
    },
  };

  const apiConfig = {
    appName: "TestApp",
    appOrigin: ["http://localhost"],
    baseUrl: "http://localhost",
    env: "test",
    logger: { level: "silent" as const },
    name: "test",
    port: 3000,
    protocol: "http",
    rest: { enabled: true },
    stripe: stripeSection,
  } as unknown as ApiConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionsCreate.mockResolvedValue({ id: "cs_test" });
    mockPromotionCodesList.mockResolvedValue({ data: [] });
    vi.mocked(Stripe).mockImplementation(
      () =>
        ({
          checkout: {
            sessions: {
              create: mockSessionsCreate,
            },
          },
          promotionCodes: {
            list: mockPromotionCodesList,
          },
        }) as unknown as InstanceType<typeof Stripe>,
    );
  });

  it("constructs Stripe with apiKey and clientConfig from config", () => {
    const client = new StripeClient(apiConfig);
    expect(client.stripe).toBeDefined();

    expect(vi.mocked(Stripe)).toHaveBeenCalledWith(
      "sk_test_client",
      stripeSection.clientConfig,
    );
  });

  it("applies checkout defaults for quantity and mode", async () => {
    const client = new StripeClient(apiConfig);

    await client.createCheckoutSession({
      productName: "Widget",
      unitAmount: 2500,
    });

    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            quantity: 1,
          }),
        ],
        mode: "payment",
      }),
    );
  });

  it("falls back cancel_url and success_url to config.urls when omitted", async () => {
    const client = new StripeClient(apiConfig);

    await client.createCheckoutSession({
      productName: "Widget",
      unitAmount: 100,
    });

    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        cancel_url: "http://cancel.test",
        success_url: "http://success.test",
      }),
    );
  });

  it("uses input URLs when provided", async () => {
    const client = new StripeClient(apiConfig);

    await client.createCheckoutSession({
      cancelUrl: "http://custom-cancel",
      productName: "Widget",
      successUrl: "http://custom-success",
      unitAmount: 100,
    });

    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        cancel_url: "http://custom-cancel",
        success_url: "http://custom-success",
      }),
    );
  });

  it("uses defaultCurrency when currency is omitted on input", async () => {
    const client = new StripeClient(apiConfig);

    await client.createCheckoutSession({
      productName: "Widget",
      unitAmount: 500,
    });

    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              currency: "usd",
            }),
          }),
        ],
      }),
    );
  });

  it("sets allow_promotion_codes from config.stripe.allowPromotionCodes", async () => {
    const client = new StripeClient(apiConfig);

    await client.createCheckoutSession({
      productName: "Widget",
      unitAmount: 500,
    });

    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        allow_promotion_codes: true,
      }),
    );
  });

  it("copies metadata onto session and payment_intent_data.metadata", async () => {
    const client = new StripeClient(apiConfig);
    const metadata = { orderId: "42" };

    await client.createCheckoutSession(
      {
        productName: "Widget",
        unitAmount: 500,
      },
      metadata,
    );

    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata,
        payment_intent_data: { metadata },
      }),
    );
  });

  it("returns the first promotion code from promotionCodes.list", async () => {
    const code = { id: "promo_1", code: "SAVE10" };
    mockPromotionCodesList.mockResolvedValue({ data: [code] });

    const client = new StripeClient(apiConfig);
    const result = await client.getActivePromotionCode("SAVE10");

    expect(mockPromotionCodesList).toHaveBeenCalledWith({
      active: true,
      code: "SAVE10",
    });
    expect(result).toBe(code);
  });

  it("returns undefined when promotionCodes.list is empty", async () => {
    mockPromotionCodesList.mockResolvedValue({ data: [] });

    const client = new StripeClient(apiConfig);
    const result = await client.getActivePromotionCode("NONE");

    expect(result).toBeUndefined();
  });
});
