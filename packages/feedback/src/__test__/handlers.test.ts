import type { FastifyInstance } from "fastify";

/* istanbul ignore file */
import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ROUTE_FEEDBACK } from "../constants";
import feedbackController from "../model/feedback/controller";

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock("../model/feedback/service", () => ({
  default: vi.fn().mockImplementation(() => ({
    create: mockCreate,
  })),
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

const buildFastify = (feedbackConfig: Record<string, unknown> = {}) => {
  const fastify = Fastify({ logger: false });

  fastify.addSchema(errorResponseSchema);
  fastify.decorate("config", {
    feedback: {
      enabled: true,
      ...feedbackConfig,
    },
  });
  fastify.decorate("dbSchema", "public");
  fastify.decorate("slonik", { connect: vi.fn(), pool: {}, query: vi.fn() });
  fastify.decorate("httpErrors", {
    unauthorized: (message: string) =>
      Object.assign(new Error(message), { statusCode: 401 }),
  });
  fastify.decorate("verifySession", () => verifySession);

  return fastify;
};

describe("feedback route handler — createFeedback", () => {
  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (fastify) {
      await fastify.close();
    }
  });

  it("returns 401 for POST /feedback when request.user is missing", async () => {
    fastify = buildFastify();
    await fastify.register(feedbackController);
    await fastify.ready();

    const response = await fastify.inject({
      method: "POST",
      payload: { message: "Great app", typeId: 1 },
      url: ROUTE_FEEDBACK,
    });

    expect(response.statusCode).toBe(401);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("creates a feedback record with the session userId for authenticated POST /feedback", async () => {
    mockCreate.mockResolvedValue({
      createdAt: 1,
      id: 1,
      message: "Great app",
      typeId: 1,
      updatedAt: 1,
      userId: "user-1",
    });

    fastify = buildFastify();
    await fastify.register(feedbackController);
    await fastify.ready();

    const response = await fastify.inject({
      headers: { "x-user-id": "user-1" },
      method: "POST",
      payload: {
        appVersion: "1.2.3",
        deviceModel: "Pixel 8",
        message: "Great app",
        platform: "android",
        typeId: 1,
      },
      url: ROUTE_FEEDBACK,
    });

    expect(response.statusCode).toBe(200);
    expect(mockCreate).toHaveBeenCalledWith({
      appVersion: "1.2.3",
      deviceModel: "Pixel 8",
      message: "Great app",
      platform: "android",
      typeId: 1,
      userId: "user-1",
    });
  });
});
