import Fastify, { type FastifyInstance } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROUTE_STRIPE_WEBHOOK } from "../constants";

const mockConstructEvent = vi.fn();

vi.mock("stripe", () => ({
  default: vi.fn(),
}));

const baseStripeConfig = {
  apiKey: "sk_test_x",
  defaultCurrency: "usd",
  enablePaymentWebhook: true,
  webhookSecret: "whsec_test",
  urls: { cancel: "http://c", success: "http://s" },
};

const buildStripeFastify = (stripeOverrides?: Record<string, unknown>) => {
  const fastify = Fastify({ logger: false });

  const stripe =
    stripeOverrides === undefined
      ? baseStripeConfig
      : { ...baseStripeConfig, ...stripeOverrides };

  fastify.decorate("config", { stripe });
  return fastify;
};

describe("stripePlugin", async () => {
  const { default: Stripe } = await import("stripe");
  const { default: plugin } = await import("../plugin");

  beforeEach(() => {
    vi.clearAllMocks();
    mockConstructEvent.mockImplementation(() => ({
      id: "evt_1",
      type: "customer.subscription.updated",
    }));
    vi.mocked(Stripe).mockImplementation(
      () =>
        ({
          webhooks: {
            constructEvent: mockConstructEvent,
          },
        }) as unknown as InstanceType<typeof Stripe>,
    );
  });

  it("warns and does not register the webhook when config.stripe is missing", async () => {
    const fastify: FastifyInstance = Fastify({ logger: false });
    const warn = vi.spyOn(fastify.log, "warn");
    fastify.decorate("config", {});

    await fastify.register(plugin);
    await fastify.ready();

    expect(warn).toHaveBeenCalledWith(
      "Stripe configuration is missing. Stripe plugin will not be registered.",
    );
    expect(
      fastify.hasRoute({ method: "POST", url: ROUTE_STRIPE_WEBHOOK }),
    ).toBe(false);

    await fastify.close();
  });

  it("does not register the webhook route when enablePaymentWebhook is false", async () => {
    const fastify = buildStripeFastify({ enablePaymentWebhook: false });

    await fastify.register(plugin);
    await fastify.ready();

    expect(
      fastify.hasRoute({ method: "POST", url: ROUTE_STRIPE_WEBHOOK }),
    ).toBe(false);

    await fastify.close();
  });

  it("registers POST at ROUTE_STRIPE_WEBHOOK when webhookPath is omitted", async () => {
    const fastify = buildStripeFastify();

    await fastify.register(plugin);
    await fastify.ready();

    expect(
      fastify.hasRoute({ method: "POST", url: ROUTE_STRIPE_WEBHOOK }),
    ).toBe(true);

    await fastify.close();
  });

  it("registers POST at config.stripe.webhookPath when set", async () => {
    const fastify = buildStripeFastify({ webhookPath: "/custom/stripe-hook" });

    await fastify.register(plugin);
    await fastify.ready();

    expect(
      fastify.hasRoute({ method: "POST", url: "/custom/stripe-hook" }),
    ).toBe(true);

    await fastify.close();
  });

  it("invokes handlers.webhook after signature verification succeeds", async () => {
    const webhook = vi.fn().mockImplementation(async () => {});
    const fastify = buildStripeFastify({ handlers: { webhook } });

    await fastify.register(plugin);
    await fastify.ready();

    const res = await fastify.inject({
      headers: {
        "content-type": "application/json",
        "stripe-signature": "v1=test",
      },
      method: "POST",
      payload: { id: "evt_x", object: "event", type: "ping" },
      url: ROUTE_STRIPE_WEBHOOK,
    });

    expect(res.statusCode).toBe(200);
    expect(webhook).toHaveBeenCalledTimes(1);
    expect(webhook.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        id: "evt_1",
        type: "customer.subscription.updated",
      }),
    );
    await fastify.close();
  });

  it("returns 500 when the default webhook handler runs", async () => {
    const fastify = buildStripeFastify();

    await fastify.register(plugin);
    await fastify.ready();

    const res = await fastify.inject({
      headers: {
        "content-type": "application/json",
        "stripe-signature": "v1=test",
      },
      method: "POST",
      payload: { id: "evt_x" },
      url: ROUTE_STRIPE_WEBHOOK,
    });

    expect(res.statusCode).toBe(500);
    await fastify.close();
  });

  it("responds with 400 when webhook signature verification fails", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("invalid");
    });

    const fastify = buildStripeFastify();

    await fastify.register(plugin);
    await fastify.ready();

    const res = await fastify.inject({
      headers: {
        "content-type": "application/json",
        "stripe-signature": "v1=bad",
      },
      method: "POST",
      payload: {},
      url: ROUTE_STRIPE_WEBHOOK,
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      error: "Webhook signature verification failed",
    });

    await fastify.close();
  });

  it("responds with 400 when webhookSecret is missing", async () => {
    const fastify = buildStripeFastify({ webhookSecret: undefined });

    await fastify.register(plugin);
    await fastify.ready();

    const res = await fastify.inject({
      headers: {
        "content-type": "application/json",
        "stripe-signature": "v1=test",
      },
      method: "POST",
      payload: {},
      url: ROUTE_STRIPE_WEBHOOK,
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      error: "Webhook secret not configured",
    });

    await fastify.close();
  });

  it("responds with 400 when stripe-signature header is missing", async () => {
    const fastify = buildStripeFastify();

    await fastify.register(plugin);
    await fastify.ready();

    const res = await fastify.inject({
      headers: { "content-type": "application/json" },
      method: "POST",
      payload: {},
      url: ROUTE_STRIPE_WEBHOOK,
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      error: "Missing stripe-signature header",
    });

    await fastify.close();
  });
});

describe("webhookController — standalone registration", async () => {
  const { default: webhookController } = await import("../webhook/controller");

  const stripeWhenWebhookDisabled = {
    apiKey: "sk_test_x",
    defaultCurrency: "usd",
    enablePaymentWebhook: false,
    webhookSecret: "whsec_test",
    urls: { cancel: "http://c", success: "http://s" },
  };

  it("does not register routes when enablePaymentWebhook is false", async () => {
    const fastify = Fastify({ logger: false });
    fastify.decorate("config", {
      stripe: stripeWhenWebhookDisabled,
    });

    await fastify.register(webhookController);
    await fastify.ready();

    expect(
      fastify.hasRoute({ method: "POST", url: ROUTE_STRIPE_WEBHOOK }),
    ).toBe(false);

    await fastify.close();
  });
});
