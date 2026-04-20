import type { SessionRequest } from "supertokens-node/framework/fastify";

import Fastify, { type FastifyInstance } from "fastify";
import { Error as STError } from "supertokens-node/recipe/session";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import hasPermission from "../hasPermission";

const { mockHasUserPermission } = vi.hoisted(() => ({
  mockHasUserPermission: vi.fn(),
}));

vi.mock("../../lib/hasUserPermission", () => ({
  default: mockHasUserPermission,
}));

const buildRequest = (
  fastify: FastifyInstance,
  user?: { id: string },
): SessionRequest => {
  return {
    server: fastify,
    user,
  } as unknown as SessionRequest;
};

describe("hasPermission middleware", () => {
  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    fastify = Fastify({ logger: false });
  });

  afterEach(async () => {
    await fastify.close();
  });

  it("throws UNAUTHORISED when request has no authenticated user", async () => {
    const preHandler = hasPermission("users:list");

    await expect(preHandler(buildRequest(fastify))).rejects.toMatchObject({
      message: "unauthorised",
      type: "UNAUTHORISED",
    });
  });

  it("throws INVALID_CLAIMS when user is missing permission", async () => {
    mockHasUserPermission.mockResolvedValue(false);
    const permission = "users:disable";
    const preHandler = hasPermission(permission);

    await expect(
      preHandler(buildRequest(fastify, { id: "user-1" })),
    ).rejects.toMatchObject({
      message: "Not have enough permission",
      payload: [
        {
          reason: {
            expectedToInclude: permission,
            message: "Not have enough permission",
          },
        },
      ],
      type: "INVALID_CLAIMS",
    });
    expect(mockHasUserPermission.mock.calls.length).toBe(1);
    expect(mockHasUserPermission.mock.calls[0]?.[1]).toBe("user-1");
    expect(mockHasUserPermission.mock.calls[0]?.[2]).toBe(permission);
  });

  it("allows request when user has required permission", async () => {
    mockHasUserPermission.mockResolvedValue(true);
    const preHandler = hasPermission("users:read");

    await expect(
      preHandler(buildRequest(fastify, { id: "user-42" })),
    ).resolves.toBeUndefined();
    expect(mockHasUserPermission.mock.calls.length).toBe(1);
    expect(mockHasUserPermission.mock.calls[0]?.[1]).toBe("user-42");
    expect(mockHasUserPermission.mock.calls[0]?.[2]).toBe("users:read");
  });

  it("throws SuperTokens errors for unauthorized outcomes", async () => {
    mockHasUserPermission.mockResolvedValue(false);
    const preHandler = hasPermission("roles:update");

    await expect(
      preHandler(buildRequest(fastify, { id: "user-7" })),
    ).rejects.toBeInstanceOf(STError);
  });
});
