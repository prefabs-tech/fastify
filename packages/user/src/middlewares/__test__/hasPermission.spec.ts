import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
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
): FastifyRequest => {
  return {
    server: fastify,
    user,
  } as unknown as FastifyRequest;
};

const withDelegate = (fastify: FastifyInstance, delegate: unknown) => {
  fastify.config.user.hasPermission = delegate as never;
};

describe("hasPermission middleware", () => {
  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    fastify = Fastify({ logger: false });
    fastify.decorate("config", { user: {} } as FastifyInstance["config"]);
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

  describe("with config.user.hasPermission set", () => {
    it("calls it once with the request, the permission and {}", async () => {
      const delegate = vi.fn().mockResolvedValue(true);
      withDelegate(fastify, delegate);
      const request = buildRequest(fastify, { id: "user-1" });

      await expect(
        hasPermission("report.view")(request),
      ).resolves.toBeUndefined();
      expect(delegate).toHaveBeenCalledOnce();
      expect(delegate.mock.calls[0]?.[0]).toBe(request);
      expect(delegate.mock.calls[0]?.slice(1)).toEqual(["report.view", {}]);
      expect(mockHasUserPermission).not.toHaveBeenCalled();
    });

    it("passes what the context function returns, also from an async one", async () => {
      const delegate = vi.fn().mockResolvedValue(true);
      withDelegate(fastify, delegate);
      const request = buildRequest(fastify, { id: "user-1" });

      await hasPermission("report.edit", { context: () => ({ orgId: 7 }) })(
        request,
      );
      await hasPermission("report.edit", {
        context: async (r) => ({ userId: r.user?.id }),
      })(request);

      expect(delegate.mock.calls[0]?.[2]).toEqual({ orgId: 7 });
      expect(delegate.mock.calls[1]?.[2]).toEqual({ userId: "user-1" });
    });

    it("throws INVALID_CLAIMS when it refuses", async () => {
      withDelegate(fastify, vi.fn().mockResolvedValue(false));

      await expect(
        hasPermission("report.edit")(buildRequest(fastify, { id: "user-1" })),
      ).rejects.toMatchObject({
        payload: [{ reason: { expectedToInclude: "report.edit" } }],
        type: "INVALID_CLAIMS",
      });
    });

    it("never calls it without a user", async () => {
      const delegate = vi.fn().mockResolvedValue(true);
      withDelegate(fastify, delegate);

      await expect(
        hasPermission("report.view")(buildRequest(fastify)),
      ).rejects.toMatchObject({ type: "UNAUTHORISED" });
      expect(delegate).not.toHaveBeenCalled();
    });

    it("fails the request when it throws, never allowing it", async () => {
      withDelegate(
        fastify,
        vi.fn().mockRejectedValue(new Error("database down")),
      );

      await expect(
        hasPermission("report.view")(buildRequest(fastify, { id: "user-1" })),
      ).rejects.toThrow("database down");
    });
  });
});
