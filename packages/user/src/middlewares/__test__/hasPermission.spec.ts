import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import hasPermission from "../hasPermission";

const {
  mockCreateInvalidClaimsError,
  mockCreateUnauthorizedError,
  mockHasUserPermission,
} = vi.hoisted(() => ({
  mockCreateInvalidClaimsError: vi.fn((errors: unknown[]) => {
    const err = new Error("Not have enough permission");
    (err as Record<string, unknown>).type = "INVALID_CLAIMS";
    (err as Record<string, unknown>).payload = errors;
    return err;
  }),
  mockCreateUnauthorizedError: vi.fn((message?: string) => {
    const err = new Error(message);
    (err as Record<string, unknown>).type = "UNAUTHORISED";
    return err;
  }),
  mockHasUserPermission: vi.fn(),
}));

vi.mock("../../lib/hasUserPermission", () => ({
  default: mockHasUserPermission,
}));

vi.mock("../../auth/adapter", () => ({
  auth: {
    errors: {
      createInvalidClaimsError: mockCreateInvalidClaimsError,
      createUnauthorizedError: mockCreateUnauthorizedError,
    },
    roles: {
      PermissionClaim: {
        key: "st-role.permissions",
      },
    },
  },
}));

const buildRequest = (
  fastify: FastifyInstance,
  user?: { id: string },
): FastifyRequest => {
  return {
    server: fastify,
    user,
  } as FastifyRequest;
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

  it("throws auth errors for unauthorized outcomes", async () => {
    mockHasUserPermission.mockResolvedValue(false);
    const preHandler = hasPermission("roles:update");

    await expect(
      preHandler(buildRequest(fastify, { id: "user-7" })),
    ).rejects.toMatchObject({
      message: "Not have enough permission",
      type: "INVALID_CLAIMS",
    });
  });
});
