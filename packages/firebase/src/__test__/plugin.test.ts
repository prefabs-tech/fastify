import type { FastifyInstance } from "fastify";

/* istanbul ignore file */
import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ROUTE_SEND_NOTIFICATION,
  ROUTE_USER_DEVICE_ADD,
  ROUTE_USER_DEVICE_REMOVE,
} from "../constants";

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

const runMigrationsMock = vi.fn().mockResolvedValue();
const initializeFirebaseMock = vi.fn();

vi.mock("../migrations/runMigrations", () => ({
  default: runMigrationsMock,
}));

vi.mock("../lib/initializeFirebase", () => ({
  default: initializeFirebaseMock,
}));

const mockSlonik = { connect: vi.fn(), pool: {}, query: vi.fn() };
const mockVerifySession = async () => {};

/**
 * Builds a Fastify instance decorated with all the dependencies the firebase
 * plugin reads from the fastify instance (config, slonik, verifySession, httpErrors).
 */
const buildFastify = (firebaseConfig: Record<string, unknown> = {}) => {
  const fastify = Fastify({ logger: false });

  fastify.addSchema(errorResponseSchema);
  fastify.decorate("config", {
    firebase: {
      enabled: true,
      routePrefix: "/api",
      ...firebaseConfig,
    },
  });
  fastify.decorate("slonik", mockSlonik);
  // verifySession is called at route registration time to produce a preHandler
  fastify.decorate("verifySession", () => mockVerifySession);
  fastify.decorate("httpErrors", {
    notFound: (message: string) =>
      Object.assign(new Error(message), { statusCode: 404 }),
    unauthorized: (message: string) =>
      Object.assign(new Error(message), { statusCode: 401 }),
  });

  return fastify;
};

describe("firebasePlugin — initialization", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not call runMigrations when enabled === false", async () => {
    fastify = buildFastify({ enabled: false });
    await fastify.register(plugin);
    await fastify.ready();

    expect(runMigrationsMock).not.toHaveBeenCalled();
    await fastify.close();
  });

  it("does not call initializeFirebase when enabled === false", async () => {
    fastify = buildFastify({ enabled: false });
    await fastify.register(plugin);
    await fastify.ready();

    expect(initializeFirebaseMock).not.toHaveBeenCalled();
    await fastify.close();
  });

  it("calls runMigrations when enabled is not false", async () => {
    fastify = buildFastify({ enabled: true });
    await fastify.register(plugin);
    await fastify.ready();

    expect(runMigrationsMock).toHaveBeenCalledOnce();
    await fastify.close();
  });

  it("calls initializeFirebase when enabled is not false", async () => {
    fastify = buildFastify({ enabled: true });
    await fastify.register(plugin);
    await fastify.ready();

    expect(initializeFirebaseMock).toHaveBeenCalledOnce();
    await fastify.close();
  });

  it("passes slonik and config to runMigrations", async () => {
    fastify = buildFastify({ enabled: true });
    await fastify.register(plugin);
    await fastify.ready();

    expect(runMigrationsMock).toHaveBeenCalledWith(
      mockSlonik,
      expect.objectContaining({ firebase: expect.any(Object) }),
    );
    await fastify.close();
  });
});

describe("firebasePlugin — userDevice route registration", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers POST /user-device route by default", async () => {
    fastify = buildFastify({ enabled: false });
    await fastify.register(plugin);
    await fastify.ready();

    expect(
      fastify.hasRoute({
        method: "POST",
        url: `${fastify.config.firebase.routePrefix}${ROUTE_USER_DEVICE_ADD}`,
      }),
    ).toBe(true);
    await fastify.close();
  });

  it("registers DELETE /user-device route by default", async () => {
    fastify = buildFastify({ enabled: false });
    await fastify.register(plugin);
    await fastify.ready();

    expect(
      fastify.hasRoute({
        method: "DELETE",
        url: `${fastify.config.firebase.routePrefix}${ROUTE_USER_DEVICE_REMOVE}`,
      }),
    ).toBe(true);
    await fastify.close();
  });

  it("skips userDevice routes when routes.userDevices.disabled === true", async () => {
    fastify = buildFastify({
      enabled: false,
      routes: { userDevices: { disabled: true } },
    });
    await fastify.register(plugin);
    await fastify.ready();

    expect(
      fastify.hasRoute({
        method: "POST",
        url: `${fastify.config.firebase.routePrefix}${ROUTE_USER_DEVICE_ADD}`,
      }),
    ).toBe(false);
    await fastify.close();
  });

  it("registers user device routes under a custom routePrefix", async () => {
    const customPrefix = "/v2/firebase";
    fastify = buildFastify({ enabled: false, routePrefix: customPrefix });
    await fastify.register(plugin);
    await fastify.ready();

    expect(
      fastify.hasRoute({
        method: "POST",
        url: `${customPrefix}${ROUTE_USER_DEVICE_ADD}`,
      }),
    ).toBe(true);

    expect(
      fastify.hasRoute({
        method: "DELETE",
        url: `${customPrefix}${ROUTE_USER_DEVICE_REMOVE}`,
      }),
    ).toBe(true);
    await fastify.close();
  });
});

describe("firebasePlugin — notification route registration", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not register notification route when notification.test.enabled is not set", async () => {
    fastify = buildFastify({ enabled: false });
    await fastify.register(plugin);
    await fastify.ready();

    expect(
      fastify.hasRoute({
        method: "POST",
        url: `${fastify.config.firebase.routePrefix}${ROUTE_SEND_NOTIFICATION}`,
      }),
    ).toBe(false);
    await fastify.close();
  });

  it("registers notification route when notification.test.enabled === true", async () => {
    fastify = buildFastify({
      enabled: false,
      notification: { test: { enabled: true, path: ROUTE_SEND_NOTIFICATION } },
    });
    await fastify.register(plugin);
    await fastify.ready();

    expect(
      fastify.hasRoute({
        method: "POST",
        url: `${fastify.config.firebase.routePrefix}${ROUTE_SEND_NOTIFICATION}`,
      }),
    ).toBe(true);
    await fastify.close();
  });

  it("registers notification test route at default path when test is enabled but path is omitted", async () => {
    fastify = buildFastify({
      enabled: false,
      notification: { test: { enabled: true } },
    });
    await fastify.register(plugin);
    await fastify.ready();

    expect(
      fastify.hasRoute({
        method: "POST",
        url: `${fastify.config.firebase.routePrefix}${ROUTE_SEND_NOTIFICATION}`,
      }),
    ).toBe(true);
    await fastify.close();
  });

  it("uses custom notification test path when configured", async () => {
    const customPath = "/custom-notify";
    fastify = buildFastify({
      enabled: false,
      notification: { test: { enabled: true, path: customPath } },
    });
    await fastify.register(plugin);
    await fastify.ready();

    expect(
      fastify.hasRoute({
        method: "POST",
        url: `${fastify.config.firebase.routePrefix}${customPath}`,
      }),
    ).toBe(true);
    await fastify.close();
  });

  it("skips notification routes when routes.notifications.disabled === true", async () => {
    fastify = buildFastify({
      enabled: false,
      notification: { test: { enabled: true, path: ROUTE_SEND_NOTIFICATION } },
      routes: { notifications: { disabled: true } },
    });
    await fastify.register(plugin);
    await fastify.ready();

    expect(
      fastify.hasRoute({
        method: "POST",
        url: `${fastify.config.firebase.routePrefix}${ROUTE_SEND_NOTIFICATION}`,
      }),
    ).toBe(false);
    await fastify.close();
  });
});
