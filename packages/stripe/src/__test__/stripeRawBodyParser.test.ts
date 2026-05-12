import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "../index";
import registerRawBodyParser from "../utils/stripeRawBodyParser";
import createStripeConfig from "./helpers/createStripeConfig";

const { stripeMock } = vi.hoisted(() => {
  const stripeMock = vi.fn().mockImplementation(() => ({
    webhooks: { constructEvent: vi.fn() },
  }));
  return { stripeMock };
});

vi.mock("stripe", () => ({ default: stripeMock }));

describe("stripeRawBodyParser — direct registration", () => {
  let fastify: FastifyInstance;

  beforeEach(() => {
    fastify = Fastify({ logger: false });
    registerRawBodyParser(fastify);
  });

  afterEach(async () => {
    await fastify.close();
  });

  it("captures the raw buffer onto request.rawBody for application/json POSTs", async () => {
    let capturedRawBody: unknown;
    fastify.post("/test", async (request) => {
      capturedRawBody = request.rawBody;
      return { ok: true };
    });

    const payload = JSON.stringify({ hello: "world" });
    const res = await fastify.inject({
      headers: { "content-type": "application/json" },
      method: "POST",
      payload,
      url: "/test",
    });

    expect(res.statusCode).toBe(200);
    expect(Buffer.isBuffer(capturedRawBody)).toBe(true);
    expect((capturedRawBody as Buffer).toString()).toBe(payload);
  });

  it("parses the JSON body so downstream handlers see request.body normally", async () => {
    let receivedBody: unknown;
    fastify.post("/test", async (request) => {
      receivedBody = request.body;
      return { ok: true };
    });

    await fastify.inject({
      headers: { "content-type": "application/json" },
      method: "POST",
      payload: JSON.stringify({ foo: "bar", n: 42 }),
      url: "/test",
    });

    expect(receivedBody).toEqual({ foo: "bar", n: 42 });
  });

  it("forwards JSON parse errors via done(error) so the route handler does not run", async () => {
    const handlerSpy = vi.fn().mockReturnValue({ ok: true });
    fastify.post("/test", async () => handlerSpy());

    const res = await fastify.inject({
      headers: { "content-type": "application/json" },
      method: "POST",
      payload: "not-json",
      url: "/test",
    });

    // NOTE: FEATURES.md item 22 claims this produces a 400, but because our
    // custom parser does not decorate the SyntaxError with `statusCode: 400`,
    // Fastify's default error handler treats it as an unhandled error and
    // returns 500. Reported as a concern, see Output Summary.
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(handlerSpy).not.toHaveBeenCalled();
  });
});

describe("stripeRawBodyParser — scoping when installed by the webhook controller", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await fastify.close();
  });

  it("does NOT apply the raw body parser to routes registered outside the webhook controller scope", async () => {
    // NOTE: FEATURES.md item 23 and ANALYSIS.md both claim the raw body parser
    // applies globally to every application/json route on the same Fastify
    // instance. That is incorrect: the webhook controller is registered
    // without `fastify-plugin`, so its content-type parser is encapsulated
    // to the controller's plugin scope and does NOT bleed into the parent
    // instance. Reported as a concern, see Output Summary.
    fastify = Fastify({ logger: false });
    fastify.decorate("config", {
      stripe: createStripeConfig({ enablePaymentWebhook: true }),
    });

    await fastify.register(plugin);

    let unrelatedRawBody: unknown;
    fastify.post("/some/other/route", async (request) => {
      unrelatedRawBody = request.rawBody;
      return { ok: true };
    });

    await fastify.ready();

    const res = await fastify.inject({
      headers: { "content-type": "application/json" },
      method: "POST",
      payload: JSON.stringify({ unrelated: true }),
      url: "/some/other/route",
    });

    expect(res.statusCode).toBe(200);
    expect(unrelatedRawBody).toBeUndefined();
  });
});
