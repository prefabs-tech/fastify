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
  id: "evt_test_1",
  object: "event",
  type: "checkout.session.completed",
};

const registerWithStripe = async (
  fastify: FastifyInstance,
  plugin: typeof import("../plugin").default,
  overrides: Partial<StripeConfig> = {},
) => {
  await fastify.register(
    plugin,
    createStripeConfig({ enablePaymentWebhook: true, ...overrides }),
  );
  await fastify.ready();
};

describe("verifyStripeSignature — webhookSecret missing", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    constructEventMock.mockReturnValue(SAMPLE_EVENT);
  });

  afterEach(async () => {
    await fastify.close();
  });

  it("responds with 400 and 'Webhook secret not configured' when webhookSecret is unset", async () => {
    fastify = Fastify({ logger: { level: "silent" } });

    await registerWithStripe(fastify, plugin, {
      webhookSecret: undefined,
    });

    const res = await fastify.inject({
      headers: {
        "content-type": "application/json",
        "stripe-signature": "t=1,v1=sig",
      },
      method: "POST",
      payload: JSON.stringify({}),
      url: "/payment/webhook",
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "Webhook secret not configured" });
  });

  it("logs an error when webhookSecret is unset", async () => {
    fastify = Fastify({ logger: { level: "silent" } });
    const errorSpy = vi.spyOn(fastify.log, "error");

    await registerWithStripe(fastify, plugin, {
      webhookSecret: undefined,
    });

    await fastify.inject({
      headers: {
        "content-type": "application/json",
        "stripe-signature": "t=1,v1=sig",
      },
      method: "POST",
      payload: JSON.stringify({}),
      url: "/payment/webhook",
    });

    expect(errorSpy).toHaveBeenCalledWith(
      "Stripe webhook secret is not configured; rejecting webhook request.",
    );
  });
});

describe("verifyStripeSignature — signature header missing", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    constructEventMock.mockReturnValue(SAMPLE_EVENT);
    fastify = Fastify({ logger: { level: "silent" } });
  });

  afterEach(async () => {
    await fastify.close();
  });

  it("responds with 400 and 'Missing stripe-signature header' when the header is absent", async () => {
    await registerWithStripe(fastify, plugin);

    const res = await fastify.inject({
      headers: { "content-type": "application/json" },
      method: "POST",
      payload: JSON.stringify({}),
      url: "/payment/webhook",
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "Missing stripe-signature header" });
  });

  it("does not invoke stripe.webhooks.constructEvent when the signature header is missing", async () => {
    await registerWithStripe(fastify, plugin);

    await fastify.inject({
      headers: { "content-type": "application/json" },
      method: "POST",
      payload: JSON.stringify({}),
      url: "/payment/webhook",
    });

    expect(constructEventMock).not.toHaveBeenCalled();
  });
});

describe("verifyStripeSignature — signature verification failure", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    fastify = Fastify({ logger: { level: "silent" } });
  });

  afterEach(async () => {
    await fastify.close();
  });

  it("responds with 400 and 'Webhook signature verification failed' when constructEvent throws", async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error("invalid signature");
    });

    await registerWithStripe(fastify, plugin);

    const res = await fastify.inject({
      headers: {
        "content-type": "application/json",
        "stripe-signature": "t=1,v1=sig",
      },
      method: "POST",
      payload: JSON.stringify({}),
      url: "/payment/webhook",
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({
      error: "Webhook signature verification failed",
    });
  });

  it("logs the underlying error when constructEvent throws", async () => {
    const verificationError = new Error("invalid signature");
    constructEventMock.mockImplementation(() => {
      throw verificationError;
    });
    const errorSpy = vi.spyOn(fastify.log, "error");

    await registerWithStripe(fastify, plugin);

    await fastify.inject({
      headers: {
        "content-type": "application/json",
        "stripe-signature": "t=1,v1=sig",
      },
      method: "POST",
      payload: JSON.stringify({}),
      url: "/payment/webhook",
    });

    expect(errorSpy).toHaveBeenCalledWith(
      { err: verificationError },
      "Stripe webhook signature verification failed",
    );
  });
});

describe("verifyStripeSignature — success", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;
  let capturedEvent: unknown;
  const webhookHandlerMock = vi.fn(async (_request, event) => {
    capturedEvent = event;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    capturedEvent = undefined;
    constructEventMock.mockReturnValue(SAMPLE_EVENT);

    fastify = Fastify({ logger: false });
  });

  afterEach(async () => {
    await fastify.close();
  });

  it("attaches the verified Stripe.Event to the request before the route handler runs", async () => {
    await registerWithStripe(fastify, plugin, {
      handlers: { webhook: webhookHandlerMock },
    });

    const res = await fastify.inject({
      headers: {
        "content-type": "application/json",
        "stripe-signature": "t=1,v1=sig",
      },
      method: "POST",
      payload: JSON.stringify({}),
      url: "/payment/webhook",
    });

    expect(res.statusCode).toBe(200);
    expect(capturedEvent).toEqual(SAMPLE_EVENT);
  });

  it("calls stripe.webhooks.constructEvent with the raw body, signature, and configured secret", async () => {
    await registerWithStripe(fastify, plugin, {
      handlers: { webhook: webhookHandlerMock },
    });

    const payload = JSON.stringify({ id: "evt_test" });
    await fastify.inject({
      headers: {
        "content-type": "application/json",
        "stripe-signature": "t=1,v1=expected",
      },
      method: "POST",
      payload,
      url: "/payment/webhook",
    });

    expect(constructEventMock).toHaveBeenCalledTimes(1);
    const [rawBody, signature, secret] = constructEventMock.mock.calls[0];
    expect(Buffer.isBuffer(rawBody)).toBe(true);
    expect(rawBody.toString()).toBe(payload);
    expect(signature).toBe("t=1,v1=expected");
    expect(secret).toBe("whsec_test_dummy");
  });
});

const buildBareRequest = () => ({
  headers: { "stripe-signature": "t=1,v1=sig" },
  rawBody: undefined,
  server: {
    config: { stripe: createStripeConfig() },
    log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  },
});

const buildBareReply = () => ({
  send: vi.fn().mockReturnThis(),
  status: vi.fn().mockReturnThis(),
});

describe("createVerifyStripeSignature — raw body missing", async () => {
  // The raw body parser is installed by the webhook controller, so it is
  // always set on requests that hit the route via fastify.inject. To exercise
  // the `if (!rawBody)` branch we call the middleware directly with a request
  // that has no rawBody.
  const { createVerifyStripeSignature } =
    await import("../middlewares/verifyStripeSignature");

  const verifyStripeSignature =
    createVerifyStripeSignature(createStripeConfig());

  type VerifyArguments = Parameters<typeof verifyStripeSignature>;

  beforeEach(() => {
    vi.clearAllMocks();
    constructEventMock.mockReturnValue(SAMPLE_EVENT);
  });

  it("responds with 400 and 'Raw body is not available for signature verification' when rawBody is unset", async () => {
    const request = buildBareRequest();
    const reply = buildBareReply();

    await verifyStripeSignature(
      request as unknown as VerifyArguments[0],
      reply as unknown as VerifyArguments[1],
    );

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      error: "Raw body is not available for signature verification",
    });
  });

  it("logs an error when rawBody is unset", async () => {
    const request = buildBareRequest();
    const reply = buildBareReply();

    await verifyStripeSignature(
      request as unknown as VerifyArguments[0],
      reply as unknown as VerifyArguments[1],
    );

    expect(request.server.log.error).toHaveBeenCalledWith(
      "Raw body is not available for signature verification",
    );
  });

  it("does not call constructEvent when rawBody is unset", async () => {
    const request = buildBareRequest();
    const reply = buildBareReply();

    await verifyStripeSignature(
      request as unknown as VerifyArguments[0],
      reply as unknown as VerifyArguments[1],
    );

    expect(constructEventMock).not.toHaveBeenCalled();
  });
});
