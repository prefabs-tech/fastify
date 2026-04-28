import type { FastifyInstance } from "fastify";

/* istanbul ignore file */
import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ROUTE_SEND_NOTIFICATION,
  ROUTE_USER_DEVICE_ADD,
  ROUTE_USER_DEVICE_REMOVE,
} from "../constants";
import notificationController from "../model/notification/controller";
import userDeviceController from "../model/userDevice/controller";

const {
  mockCreate,
  mockGetByUserId,
  mockRemoveByDeviceToken,
  sendPushNotificationMock,
} = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockGetByUserId: vi.fn(),
  mockRemoveByDeviceToken: vi.fn(),
  sendPushNotificationMock: vi.fn(),
}));

vi.mock("../model/userDevice/service", () => ({
  default: vi.fn().mockImplementation(() => ({
    create: mockCreate,
    getByUserId: mockGetByUserId,
    removeByDeviceToken: mockRemoveByDeviceToken,
  })),
}));

vi.mock("../lib/sendPushNotification", () => ({
  default: sendPushNotificationMock,
}));

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

type VerifySessionRequest = {
  headers: { "x-user-id"?: string };
  user?: object;
};

const verifySession = async (request: VerifySessionRequest) => {
  if (request.headers["x-user-id"]) {
    request.user = { id: request.headers["x-user-id"] };
  }
};

const buildFastify = (firebaseConfig: Record<string, unknown> = {}) => {
  const fastify = Fastify({ logger: false });

  fastify.addSchema(errorResponseSchema);
  fastify.decorate("config", {
    firebase: {
      enabled: true,
      notification: {
        test: {
          enabled: true,
          path: ROUTE_SEND_NOTIFICATION,
        },
      },
      ...firebaseConfig,
    },
  });
  fastify.decorate("dbSchema", "public");
  fastify.decorate("slonik", { connect: vi.fn(), pool: {}, query: vi.fn() });
  fastify.decorate("httpErrors", {
    notFound: (message: string) =>
      Object.assign(new Error(message), { statusCode: 404 }),
    unauthorized: (message: string) =>
      Object.assign(new Error(message), { statusCode: 401 }),
    unprocessableEntity: (message: string) =>
      Object.assign(new Error(message), { statusCode: 422 }),
  });
  fastify.decorate("verifySession", () => verifySession);

  return fastify;
};

describe("firebase route handlers", () => {
  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (fastify) {
      await fastify.close();
    }
  });

  it("returns 401 for POST /user-device when request.user is missing", async () => {
    fastify = buildFastify();
    await fastify.register(userDeviceController);
    await fastify.ready();

    const response = await fastify.inject({
      method: "POST",
      payload: { deviceToken: "token-abc" },
      url: ROUTE_USER_DEVICE_ADD,
    });

    expect(response.statusCode).toBe(401);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("creates a user-device record for authenticated POST /user-device", async () => {
    mockCreate.mockResolvedValue({
      createdAt: 1,
      deviceToken: "token-abc",
      updatedAt: 1,
      userId: "user-1",
    });

    fastify = buildFastify();
    await fastify.register(userDeviceController);
    await fastify.ready();

    const response = await fastify.inject({
      headers: { "x-user-id": "user-1" },
      method: "POST",
      payload: { deviceToken: "token-abc" },
      url: ROUTE_USER_DEVICE_ADD,
    });

    expect(response.statusCode).toBe(200);
    expect(mockCreate).toHaveBeenCalledWith({
      deviceToken: "token-abc",
      userId: "user-1",
    });
  });

  it("returns 404 for DELETE /user-device when user has no devices", async () => {
    mockGetByUserId.mockResolvedValue([]);

    fastify = buildFastify();
    await fastify.register(userDeviceController);
    await fastify.ready();

    const response = await fastify.inject({
      headers: { "x-user-id": "user-1" },
      method: "DELETE",
      payload: { deviceToken: "token-abc" },
      url: ROUTE_USER_DEVICE_REMOVE,
    });

    expect(response.statusCode).toBe(404);
    expect(mockRemoveByDeviceToken).not.toHaveBeenCalled();
  });

  it("returns 422 for DELETE /user-device when token is not owned by user", async () => {
    mockGetByUserId.mockResolvedValue([
      {
        deviceToken: "different-token",
        userId: "user-1",
      },
    ]);

    fastify = buildFastify();
    await fastify.register(userDeviceController);
    await fastify.ready();

    const response = await fastify.inject({
      headers: { "x-user-id": "user-1" },
      method: "DELETE",
      payload: { deviceToken: "token-abc" },
      url: ROUTE_USER_DEVICE_REMOVE,
    });

    expect(response.statusCode).toBe(422);
    expect(mockRemoveByDeviceToken).not.toHaveBeenCalled();
  });

  it("deletes device for authenticated DELETE /user-device when token is owned", async () => {
    mockGetByUserId.mockResolvedValue([
      {
        deviceToken: "token-abc",
        userId: "user-1",
      },
    ]);
    mockRemoveByDeviceToken.mockResolvedValue({
      createdAt: 1,
      deviceToken: "token-abc",
      updatedAt: 1,
      userId: "user-1",
    });

    fastify = buildFastify();
    await fastify.register(userDeviceController);
    await fastify.ready();

    const response = await fastify.inject({
      headers: { "x-user-id": "user-1" },
      method: "DELETE",
      payload: { deviceToken: "token-abc" },
      url: ROUTE_USER_DEVICE_REMOVE,
    });

    expect(response.statusCode).toBe(200);
    expect(mockRemoveByDeviceToken).toHaveBeenCalledWith("token-abc");
  });

  it("returns 422 for POST /send-notification when receiver has no devices", async () => {
    mockGetByUserId.mockResolvedValue([]);

    fastify = buildFastify();
    await fastify.register(notificationController);
    await fastify.ready();

    const response = await fastify.inject({
      headers: { "x-user-id": "sender-1" },
      method: "POST",
      payload: { message: "Body", title: "Title", userId: "receiver-1" },
      url: ROUTE_SEND_NOTIFICATION,
    });

    expect(response.statusCode).toBe(422);
    expect(sendPushNotificationMock).not.toHaveBeenCalled();
  });

  it("sends push notification with android/apns defaults for valid POST /send-notification", async () => {
    mockGetByUserId.mockResolvedValue([
      {
        deviceToken: "token-a",
        userId: "receiver-1",
      },
      {
        deviceToken: "token-b",
        userId: "receiver-1",
      },
    ]);
    sendPushNotificationMock.mockResolvedValue();

    fastify = buildFastify();
    await fastify.register(notificationController);
    await fastify.ready();

    const response = await fastify.inject({
      headers: { "x-user-id": "sender-1" },
      method: "POST",
      payload: {
        body: "Body",
        data: { orderId: "42" },
        message: "Body",
        title: "Title",
        userId: "receiver-1",
      },
      url: ROUTE_SEND_NOTIFICATION,
    });

    expect(response.statusCode).toBe(200);
    expect(sendPushNotificationMock).toHaveBeenCalledWith({
      android: {
        notification: { sound: "default" },
        priority: "high",
      },
      apns: {
        payload: {
          aps: { sound: "default" },
        },
      },
      data: {
        body: "Body",
        orderId: "42",
        title: "Title",
      },
      notification: {
        body: "Body",
        title: "Title",
      },
      tokens: ["token-a", "token-b"],
    });
  });
});
