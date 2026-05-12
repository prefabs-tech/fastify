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
    fastify.decorate("config", {
      stripe: createStripeConfig({ enablePaymentWebhook: true }),
    });

    await fastify.register(plugin);
    await fastify.ready();

    expect(fastify.hasRoute({ method: "POST", url: "/payment/webhook" })).toBe(
      true,
    );
  });

  it("registers POST at the configured webhookPath when set", async () => {
    fastify = Fastify({ logger: false });
    fastify.decorate("config", {
      stripe: createStripeConfig({
        enablePaymentWebhook: true,
        webhookPath: "/custom/webhook",
      }),
    });

    await fastify.register(plugin);
    await fastify.ready();

    expect(fastify.hasRoute({ method: "POST", url: "/custom/webhook" })).toBe(
      true,
    );
  });

  it("logs 'Registering Stripe webhook route' at info level", async () => {
    fastify = Fastify({ logger: { level: "silent" } });
    fastify.decorate("config", {
      stripe: createStripeConfig({ enablePaymentWebhook: true }),
    });
    const infoSpy = vi.spyOn(fastify.log, "info");

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

  it("invokes config.stripe.handlers.webhook with request and verified event", async () => {
    const webhookHandlerMock = vi.fn().mockResolvedValue();
    fastify = Fastify({ logger: false });
    fastify.decorate("config", {
      stripe: createStripeConfig({
        enablePaymentWebhook: true,
        handlers: { webhook: webhookHandlerMock },
      }),
    });

    await fastify.register(plugin);
    await fastify.ready();

    const res = await injectWebhook(fastify, "/payment/webhook");

    expect(res.statusCode).toBe(200);
    expect(webhookHandlerMock).toHaveBeenCalledTimes(1);
    expect(webhookHandlerMock.mock.calls[0][1]).toEqual(SAMPLE_EVENT);
  });

  it("returns 500 with 'Webhook handler not implemented' when no custom handler is configured", async () => {
    fastify = Fastify({ logger: false });
    fastify.decorate("config", {
      stripe: createStripeConfig({ enablePaymentWebhook: true }),
    });

    await fastify.register(plugin);
    await fastify.ready();

    const res = await injectWebhook(fastify, "/payment/webhook");

    expect(res.statusCode).toBe(500);
    expect(res.json().message).toBe("Webhook handler not implemented");
  });

  it("does not call the default handler when handlers.webhook is configured", async () => {
    const webhookHandlerMock = vi.fn().mockResolvedValue();
    fastify = Fastify({ logger: false });
    fastify.decorate("config", {
      stripe: createStripeConfig({
        enablePaymentWebhook: true,
        handlers: { webhook: webhookHandlerMock },
      }),
    });

    await fastify.register(plugin);
    await fastify.ready();

    const res = await injectWebhook(fastify, "/payment/webhook");

    expect(res.statusCode).toBe(200);
    expect(webhookHandlerMock).toHaveBeenCalled();
  });
});

describe("webhookController — defensive guard", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await fastify.close();
  });

  it("returns 500 with 'Stripe event not found on request' when preHandler did not attach the event", async () => {
    // Force constructEvent to return a falsy value so verifyStripeSignature
    // assigns `request.stripeEvent = undefined` and the controller's
    // defensive guard fires.
    constructEventMock.mockReturnValue(
      undefined as unknown as ReturnType<typeof constructEventMock>,
    );

    fastify = Fastify({ logger: false });
    fastify.decorate("config", {
      stripe: createStripeConfig({ enablePaymentWebhook: true }),
    });

    await fastify.register(plugin);
    await fastify.ready();

    const res = await injectWebhook(fastify, "/payment/webhook");

    expect(res.statusCode).toBe(500);
    expect(res.json().message).toBe("Stripe event not found on request");
  });
});
