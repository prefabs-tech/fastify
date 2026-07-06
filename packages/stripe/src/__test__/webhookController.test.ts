import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StripeConfig } from "../types";

import "../index";
import createStripeConfig from "./helpers/createStripeConfig";

const { constructEventMock, stripeMock } = vi.hoisted(() => {
  const constructEventMock = vi.fn();
  const stripeMock = Object.assign(vi.fn(), {
    webhooks: { constructEvent: constructEventMock },
  });
  return { constructEventMock, stripeMock };
});

vi.mock("stripe", () => ({ default: stripeMock }));

const SAMPLE_EVENT = {
  data: { object: { id: "cs_test_1" } },
  id: "evt_test_1",
  object: "event",
  type: "checkout.session.completed",
};

const injectWebhook = (
  fastify: FastifyInstance,
  url: string,
  payload?: Record<string, unknown>,
) =>
  fastify.inject({
    headers: {
      "content-type": "application/json",
      "stripe-signature": "t=1,v1=sig",
    },
    method: "POST",
    payload: JSON.stringify(payload ?? { id: "evt_test_1" }),
    url,
  });

function decorateConfig(fastify: FastifyInstance) {
  fastify.decorate("config", {} as unknown as FastifyInstance["config"]);
}

function setStripeConfig(
  fastify: FastifyInstance,
  overrides: Partial<StripeConfig> = {},
) {
  fastify.config.stripe = createStripeConfig({
    enablePaymentWebhook: true,
    ...overrides,
  });
}

describe("webhookController — route registration", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    constructEventMock.mockReturnValue(SAMPLE_EVENT);
  });

  afterEach(async () => {
    await fastify.close();
  });

  it("registers POST at /payment/webhook by default when webhookPath is unset", async () => {
    fastify = Fastify({ logger: false });
    decorateConfig(fastify);

    setStripeConfig(fastify);
    await fastify.register(plugin);
    await fastify.ready();

    expect(fastify.hasRoute({ method: "POST", url: "/payment/webhook" })).toBe(
      true,
    );
  });

  it("registers POST at the configured webhookPath when set", async () => {
    fastify = Fastify({ logger: false });
    decorateConfig(fastify);

    setStripeConfig(fastify, { webhookPath: "/custom/webhook" });
    await fastify.register(plugin);
    await fastify.ready();

    expect(fastify.hasRoute({ method: "POST", url: "/custom/webhook" })).toBe(
      true,
    );
  });

  it("logs 'Registering Stripe webhook route' at info level", async () => {
    fastify = Fastify({ logger: { level: "silent" } });
    decorateConfig(fastify);
    const infoSpy = vi.spyOn(fastify.log, "info");

    setStripeConfig(fastify);
    await fastify.register(plugin);
    await fastify.ready();

    expect(infoSpy).toHaveBeenCalledWith("Registering Stripe webhook route");
  });
});

describe("webhookController — dispatch", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    constructEventMock.mockReturnValue(SAMPLE_EVENT);
  });

  afterEach(async () => {
    await fastify.close();
  });

  it("invokes the matching typed handler from config.stripe.handlers.webhook", async () => {
    const webhookHandlerMock = vi.fn().mockResolvedValue();
    fastify = Fastify({ logger: false });
    decorateConfig(fastify);

    setStripeConfig(fastify, {
      handlers: {
        webhook: {
          "checkout.session.completed": webhookHandlerMock,
        },
      },
    });
    await fastify.register(plugin);
    await fastify.ready();

    const res = await injectWebhook(fastify, "/payment/webhook");

    expect(res.statusCode).toBe(200);
    expect(webhookHandlerMock).toHaveBeenCalledTimes(1);
    expect(webhookHandlerMock.mock.calls[0][1]).toEqual(SAMPLE_EVENT);
  });

  it("responds 200 with the default fallback handler when no custom handler is configured (to suppress Stripe retries)", async () => {
    fastify = Fastify({ logger: false });
    decorateConfig(fastify);

    setStripeConfig(fastify);
    await fastify.register(plugin);
    await fastify.ready();

    const res = await injectWebhook(fastify, "/payment/webhook");

    expect(res.statusCode).toBe(200);
  });

  it("warns at registration time when enablePaymentWebhook is true but handlers.webhook is unset", async () => {
    fastify = Fastify({ logger: { level: "silent" } });
    decorateConfig(fastify);
    const warnSpy = vi.spyOn(fastify.log, "warn");

    setStripeConfig(fastify);
    await fastify.register(plugin);
    await fastify.ready();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("config.stripe.handlers.webhook is not set"),
    );
  });

  it("does NOT warn at registration time when handlers.webhook is configured", async () => {
    fastify = Fastify({ logger: { level: "silent" } });
    decorateConfig(fastify);
    const warnSpy = vi.spyOn(fastify.log, "warn");

    setStripeConfig(fastify, {
      handlers: {
        webhook: {
          "checkout.session.completed": vi.fn().mockResolvedValue(),
        },
      },
    });
    await fastify.register(plugin);
    await fastify.ready();

    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("config.stripe.handlers.webhook is not set"),
    );
  });

  it("falls back to the default handler when the event type has no matching handler in the map", async () => {
    // Register the webhook with a handler map that does NOT cover the
    // incoming event type; the default fallback handler should log an
    // error and still respond 200 to stop Stripe retries.
    const nonMatchingHandler = vi.fn().mockResolvedValue();
    fastify = Fastify({ logger: false });
    decorateConfig(fastify);

    setStripeConfig(fastify, {
      handlers: {
        webhook: {
          "payment_intent.succeeded": nonMatchingHandler,
        },
      },
    });
    await fastify.register(plugin);
    await fastify.ready();

    const res = await injectWebhook(fastify, "/payment/webhook");

    expect(res.statusCode).toBe(200);
    expect(nonMatchingHandler).not.toHaveBeenCalled();
  });

  it("responds 200 for an unmapped event type (no crash)", async () => {
    // No handlers.webhook configured at all — default fallback
    fastify = Fastify({ logger: false });
    decorateConfig(fastify);

    setStripeConfig(fastify);
    await fastify.register(plugin);
    await fastify.ready();

    const res = await injectWebhook(fastify, "/payment/webhook");

    expect(res.statusCode).toBe(200);
  });
});

describe("webhookController — defensive guards", async () => {
  const { default: plugin } = await import("../plugin");
  const { default: webhookController } = await import("../webhook/controller");

  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await fastify.close();
  });

  it("throws when the webhook controller is registered without stripeConfig", async () => {
    fastify = Fastify({ logger: { level: "silent" } });

    await expect(fastify.register(webhookController)).rejects.toThrow(
      "Missing stripe configuration. Did you forget to pass { stripeConfig } to the Stripe webhook controller?",
    );
  });

  it("returns 500 with { error: 'Stripe event not found on request' } when preHandler did not attach the event", async () => {
    // Force constructEvent to return a falsy value so verifyStripeSignature
    // assigns `request.stripeEvent = undefined` and the controller's
    // defensive guard fires.
    constructEventMock.mockReturnValue(
      undefined as unknown as ReturnType<typeof constructEventMock>,
    );

    fastify = Fastify({ logger: false });
    decorateConfig(fastify);

    setStripeConfig(fastify);
    await fastify.register(plugin);
    await fastify.ready();

    const res = await injectWebhook(fastify, "/payment/webhook");

    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({
      error: "Stripe event not found on request",
    });
  });
});
