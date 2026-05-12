import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

  it("does not throw when config.stripe is missing", async () => {
    await expect(fastify.register(plugin)).resolves.not.toThrow();
  });

  it("warns when config.stripe is missing", async () => {
    const warnSpy = vi.spyOn(fastify.log, "warn");
    await fastify.register(plugin);
    await fastify.ready();
    expect(warnSpy).toHaveBeenCalledWith(
      "Stripe configuration is missing. Stripe plugin will not be registered.",
    );
  });

  it("does not register the webhook route when config.stripe is missing", async () => {
    await fastify.register(plugin);
    await fastify.ready();
    expect(fastify.hasRoute({ method: "POST", url: "/payment/webhook" })).toBe(
      false,
    );
  });
});

describe("stripePlugin — configuration present", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    fastify = Fastify({ logger: { level: "silent" } });
  });

  afterEach(async () => {
    await fastify.close();
  });

  it("logs 'Registering Stripe plugin' at info level when config is present", async () => {
    fastify.decorate("config", {
      stripe: createStripeConfig({ enablePaymentWebhook: false }),
    });
    const infoSpy = vi.spyOn(fastify.log, "info");

    await fastify.register(plugin);
    await fastify.ready();

    expect(infoSpy).toHaveBeenCalledWith("Registering Stripe plugin");
  });

  it("does not register the webhook route when enablePaymentWebhook is false", async () => {
    fastify.decorate("config", {
      stripe: createStripeConfig({ enablePaymentWebhook: false }),
    });

    await fastify.register(plugin);
    await fastify.ready();

    expect(fastify.hasRoute({ method: "POST", url: "/payment/webhook" })).toBe(
      false,
    );
  });

  it("registers the webhook route when enablePaymentWebhook is true", async () => {
    fastify.decorate("config", {
      stripe: createStripeConfig({ enablePaymentWebhook: true }),
    });

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
    fastify.decorate("config", {
      stripe: createStripeConfig({ enablePaymentWebhook: true }),
    });
  });

  afterEach(async () => {
    await fastify.close();
  });

  it("registers without encapsulation so the route is reachable on the top-level instance", async () => {
    await fastify.register(plugin);
    await fastify.ready();

    expect(fastify.hasRoute({ method: "POST", url: "/payment/webhook" })).toBe(
      true,
    );
  });
});
