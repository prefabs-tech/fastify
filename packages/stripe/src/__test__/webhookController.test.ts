import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

    await fastify.register(
      plugin,
      createStripeConfig({ enablePaymentWebhook: true }),
    );
    await fastify.ready();

    expect(fastify.hasRoute({ method: "POST", url: "/payment/webhook" })).toBe(
      true,
    );
  });

  it("registers POST at the configured webhookPath when set", async () => {
    fastify = Fastify({ logger: false });

    await fastify.register(
      plugin,
      createStripeConfig({
        enablePaymentWebhook: true,
        webhookPath: "/custom/webhook",
      }),
    );
    await fastify.ready();

    expect(fastify.hasRoute({ method: "POST", url: "/custom/webhook" })).toBe(
      true,
    );
  });

  it("logs 'Registering Stripe webhook route' at info level", async () => {
    fastify = Fastify({ logger: { level: "silent" } });
    const infoSpy = vi.spyOn(fastify.log, "info");

    await fastify.register(
      plugin,
      createStripeConfig({ enablePaymentWebhook: true }),
    );
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

  it("invokes config.stripe.handlers.webhook with request and verified event", async () => {
    const webhookHandlerMock = vi.fn().mockResolvedValue();
    fastify = Fastify({ logger: false });

    await fastify.register(
      plugin,
      createStripeConfig({
        enablePaymentWebhook: true,
        handlers: { webhook: webhookHandlerMock },
      }),
    );
    await fastify.ready();

    const res = await injectWebhook(fastify, "/payment/webhook");

    expect(res.statusCode).toBe(200);
    expect(webhookHandlerMock).toHaveBeenCalledTimes(1);
    expect(webhookHandlerMock.mock.calls[0][1]).toEqual(SAMPLE_EVENT);
  });

  it("responds 200 with the default fallback handler when no custom handler is configured (to suppress Stripe retries)", async () => {
    fastify = Fastify({ logger: false });

    await fastify.register(
      plugin,
      createStripeConfig({ enablePaymentWebhook: true }),
    );
    await fastify.ready();

    const res = await injectWebhook(fastify, "/payment/webhook");

    expect(res.statusCode).toBe(200);
  });

  it("warns at registration time when enablePaymentWebhook is true but handlers.webhook is unset", async () => {
    fastify = Fastify({ logger: { level: "silent" } });
    const warnSpy = vi.spyOn(fastify.log, "warn");

    await fastify.register(
      plugin,
      createStripeConfig({ enablePaymentWebhook: true }),
    );
    await fastify.ready();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("config.stripe.handlers.webhook is not set"),
    );
  });

  it("does NOT warn at registration time when handlers.webhook is configured", async () => {
    const webhookHandlerMock = vi.fn().mockResolvedValue();
    fastify = Fastify({ logger: { level: "silent" } });
    const warnSpy = vi.spyOn(fastify.log, "warn");

    await fastify.register(
      plugin,
      createStripeConfig({
        enablePaymentWebhook: true,
        handlers: { webhook: webhookHandlerMock },
      }),
    );
    await fastify.ready();

    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("config.stripe.handlers.webhook is not set"),
    );
  });

  it("does not call the default handler when handlers.webhook is configured", async () => {
    const webhookHandlerMock = vi.fn().mockResolvedValue();
    fastify = Fastify({ logger: false });

    await fastify.register(
      plugin,
      createStripeConfig({
        enablePaymentWebhook: true,
        handlers: { webhook: webhookHandlerMock },
      }),
    );
    await fastify.ready();

    const res = await injectWebhook(fastify, "/payment/webhook");

    expect(res.statusCode).toBe(200);
    expect(webhookHandlerMock).toHaveBeenCalled();
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

    await fastify.register(
      plugin,
      createStripeConfig({ enablePaymentWebhook: true }),
    );
    await fastify.ready();

    const res = await injectWebhook(fastify, "/payment/webhook");

    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({
      error: "Stripe event not found on request",
    });
  });
});
