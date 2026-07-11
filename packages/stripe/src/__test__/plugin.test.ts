import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StripeConfig } from "../types";

import "../index";
import createStripeConfig from "./helpers/createStripeConfig";

const { stripeMock } = vi.hoisted(() => {
  const stripeMock = vi.fn().mockImplementation(() => ({
    checkout: { sessions: { create: vi.fn() } },
    promotionCodes: { list: vi.fn() },
    webhooks: { constructEvent: vi.fn() },
  }));
  return { stripeMock };
});

vi.mock("stripe", () => ({ default: stripeMock }));

describe("stripePlugin — missing configuration", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    fastify = Fastify({ logger: { level: "silent" } });
    fastify.decorate("config", {} as unknown as FastifyInstance["config"]);
  });

  afterEach(async () => {
    await fastify.close();
  });

  it("throws when register is called without options and config.stripe is absent", async () => {
    await expect(fastify.register(plugin)).rejects.toThrow(
      "Missing stripe configuration. Did you forget to pass it to the stripe plugin?",
    );
  });

  it("throws when register is called with an empty options object and config.stripe is absent", async () => {
    await expect(fastify.register(plugin, {} as StripeConfig)).rejects.toThrow(
      "Missing stripe configuration. Did you forget to pass it to the stripe plugin?",
    );
  });
});

describe("stripePlugin — configuration present", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    fastify = Fastify({ logger: { level: "silent" } });
    fastify.decorate("config", {} as unknown as FastifyInstance["config"]);
  });

  afterEach(async () => {
    await fastify.close();
  });

  it("logs 'Registering Stripe plugin' at info level when config is passed", async () => {
    const infoSpy = vi.spyOn(fastify.log, "info");

    fastify.config.stripe = createStripeConfig({ enablePaymentWebhook: false });
    await fastify.register(plugin);
    await fastify.ready();

    expect(infoSpy).toHaveBeenCalledWith("Registering Stripe plugin");
  });

  it("does not register the webhook route when enablePaymentWebhook is false", async () => {
    fastify.config.stripe = createStripeConfig({ enablePaymentWebhook: false });
    await fastify.register(plugin);
    await fastify.ready();

    expect(fastify.hasRoute({ method: "POST", url: "/payment/webhook" })).toBe(
      false,
    );
  });

  it("registers the webhook route when enablePaymentWebhook is true", async () => {
    fastify.config.stripe = createStripeConfig({ enablePaymentWebhook: true });
    await fastify.register(plugin);
    await fastify.ready();

    expect(fastify.hasRoute({ method: "POST", url: "/payment/webhook" })).toBe(
      true,
    );
  });
});

describe("stripePlugin — fastify-plugin wrapping", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    fastify = Fastify({ logger: false });
    fastify.decorate("config", {} as unknown as FastifyInstance["config"]);
  });

  afterEach(async () => {
    await fastify.close();
  });

  it("registers without encapsulation so the route is reachable on the top-level instance", async () => {
    fastify.config.stripe = createStripeConfig({ enablePaymentWebhook: true });
    await fastify.register(plugin);
    await fastify.ready();

    expect(fastify.hasRoute({ method: "POST", url: "/payment/webhook" })).toBe(
      true,
    );
  });
});
