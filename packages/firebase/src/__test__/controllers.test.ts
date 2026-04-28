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

const mockVerifySession = async () => {};

const buildFastify = (firebaseConfig: Record<string, unknown> = {}) => {
  const fastify = Fastify({ logger: false });

  fastify.addSchema(errorResponseSchema);
  fastify.decorate("config", {
    firebase: {
      enabled: true,
      ...firebaseConfig,
    },
  });
  fastify.decorate("verifySession", () => mockVerifySession);
  fastify.decorate("httpErrors", {
    notFound: (message: string) =>
      Object.assign(new Error(message), { statusCode: 404 }),
    unauthorized: (message: string) =>
      Object.assign(new Error(message), { statusCode: 401 }),
  });

  return fastify;
};

describe("notification controller — custom handler overrides", async () => {
  const { default: controller } =
    await import("../model/notification/controller");

  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls custom sendNotification handler from config.firebase.handlers.notification", async () => {
    const customHandler = vi.fn().mockImplementation(async (_req, reply) => {
      await reply.send({ ok: true });
    });

    fastify = buildFastify({
      handlers: { notification: { sendNotification: customHandler } },
      notification: { test: { enabled: true, path: ROUTE_SEND_NOTIFICATION } },
    });
    await fastify.register(controller);
    await fastify.ready();

    await fastify.inject({
      method: "POST",
      payload: { message: "Hello", title: "Test", userId: "user-1" },
      url: ROUTE_SEND_NOTIFICATION,
    });

    expect(customHandler).toHaveBeenCalled();
    await fastify.close();
  });
});

describe("userDevice controller — custom handler overrides", async () => {
  const { default: controller } =
    await import("../model/userDevice/controller");

  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls custom addUserDevice handler from config.firebase.handlers.userDevice", async () => {
    const customHandler = vi.fn().mockImplementation(async (_req, reply) => {
      await reply.send({ ok: true });
    });

    fastify = buildFastify({
      handlers: { userDevice: { addUserDevice: customHandler } },
    });
    await fastify.register(controller);
    await fastify.ready();

    await fastify.inject({
      method: "POST",
      payload: { deviceToken: "token-abc" },
      url: ROUTE_USER_DEVICE_ADD,
    });

    expect(customHandler).toHaveBeenCalled();
    await fastify.close();
  });

  it("calls custom removeUserDevice handler from config.firebase.handlers.userDevice", async () => {
    const customHandler = vi.fn().mockImplementation(async (_req, reply) => {
      await reply.send({ ok: true });
    });

    fastify = buildFastify({
      handlers: { userDevice: { removeUserDevice: customHandler } },
    });
    await fastify.register(controller);
    await fastify.ready();

    await fastify.inject({
      method: "DELETE",
      payload: { deviceToken: "token-abc" },
      url: ROUTE_USER_DEVICE_REMOVE,
    });

    expect(customHandler).toHaveBeenCalled();
    await fastify.close();
  });
});
