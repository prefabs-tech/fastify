import type { FastifyInstance } from "fastify";

/* istanbul ignore file */
import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ROUTE_FEEDBACK } from "../constants";

// The route schemas reference "ErrorResponse#" which is registered by the error-handler plugin.
// We add it directly here so the test instance can resolve the $ref.
const errorResponseSchema = {
  $id: "ErrorResponse",
  additionalProperties: true,
  properties: {
    code: { type: "string" },
    error: { type: "string" },
    message: { type: "string" },
    statusCode: { type: "number" },
  },
  type: "object",
};

const runMigrationsMock = vi.fn().mockResolvedValue(undefined);

vi.mock("../migrations/runMigrations", () => ({
  default: runMigrationsMock,
}));

const mockSlonik = { connect: vi.fn(), pool: {}, query: vi.fn() };
const mockVerifySession = async () => {};

/**
 * Builds a Fastify instance decorated with all the dependencies the feedback
 * plugin reads from the fastify instance (config, slonik, verifySession, httpErrors).
 */
const buildFastify = (feedbackConfig: Record<string, unknown> = {}) => {
  const fastify = Fastify({ logger: false });

  fastify.addSchema(errorResponseSchema);
  fastify.decorate("config", {
    feedback: {
      enabled: true,
      routePrefix: "/api",
      ...feedbackConfig,
    },
  });
  fastify.decorate("slonik", mockSlonik);
  // verifySession is called at route registration time to produce a preHandler
  fastify.decorate("verifySession", () => mockVerifySession);
  fastify.decorate("httpErrors", {
    unauthorized: (message: string) =>
      Object.assign(new Error(message), { statusCode: 401 }),
  });

  return fastify;
};

describe("feedbackPlugin — initialization", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => fastify.close());

  it("does not call runMigrations when enabled === false", async () => {
    fastify = buildFastify({ enabled: false });
    await fastify.register(plugin);
    await fastify.ready();

    expect(runMigrationsMock).not.toHaveBeenCalled();
    await fastify.close();
  });

  it("calls runMigrations when enabled is not false", async () => {
    fastify = buildFastify({ enabled: true });
    await fastify.register(plugin);
    await fastify.ready();

    expect(runMigrationsMock).toHaveBeenCalledOnce();
    await fastify.close();
  });

  it("passes slonik and config to runMigrations", async () => {
    fastify = buildFastify({ enabled: true });
    await fastify.register(plugin);
    await fastify.ready();

    expect(runMigrationsMock).toHaveBeenCalledWith(
      mockSlonik,
      expect.objectContaining({ feedback: expect.any(Object) }),
    );
    await fastify.close();
  });
});

describe("feedbackPlugin — route registration", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers POST /feedback route by default", async () => {
    fastify = buildFastify({ enabled: false });
    await fastify.register(plugin);
    await fastify.ready();

    expect(
      fastify.hasRoute({
        method: "POST",
        url: `${fastify.config.feedback.routePrefix}${ROUTE_FEEDBACK}`,
      }),
    ).toBe(true);
    await fastify.close();
  });

  it("skips feedback route when routes.feedbacks.disabled === true", async () => {
    fastify = buildFastify({
      enabled: false,
      routes: { feedbacks: { disabled: true } },
    });
    await fastify.register(plugin);
    await fastify.ready();

    expect(
      fastify.hasRoute({
        method: "POST",
        url: `${fastify.config.feedback.routePrefix}${ROUTE_FEEDBACK}`,
      }),
    ).toBe(false);
    await fastify.close();
  });

  it("registers the feedback route under a custom routePrefix", async () => {
    const customPrefix = "/v2/feedback";
    fastify = buildFastify({ enabled: false, routePrefix: customPrefix });
    await fastify.register(plugin);
    await fastify.ready();

    expect(
      fastify.hasRoute({
        method: "POST",
        url: `${customPrefix}${ROUTE_FEEDBACK}`,
      }),
    ).toBe(true);
    await fastify.close();
  });
});
