import type { FastifyRequest } from "fastify";

import { Error as STError } from "supertokens-node/recipe/session";
import { describe, expect, it, vi } from "vitest";

import hasPermission from "../hasPermission";

const USER = { id: "user-1" };

const buildRequest = (answer: unknown, { signedIn = true } = {}) => {
  const check =
    answer instanceof Error
      ? vi.fn().mockRejectedValue(answer)
      : vi.fn().mockResolvedValue(answer);

  return {
    check,
    request: {
      hasPermission: check,
      user: signedIn ? USER : undefined,
    } as unknown as FastifyRequest,
  };
};

describe("hasPermission middleware", () => {
  it("throws UNAUTHORISED without a user, never checking", async () => {
    const { check, request } = buildRequest(true, { signedIn: false });

    await expect(hasPermission("users:list")(request)).rejects.toMatchObject({
      message: "unauthorised",
      type: "UNAUTHORISED",
    });
    expect(check).not.toHaveBeenCalled();
  });

  it("allows the request when request.hasPermission answers true", async () => {
    const { check, request } = buildRequest(true);

    await expect(hasPermission("users:read")(request)).resolves.toBeUndefined();
    expect(check).toHaveBeenCalledOnce();
    expect(check).toHaveBeenCalledWith("users:read", {});
  });

  it("throws INVALID_CLAIMS naming the permission when it answers false", async () => {
    const { request } = buildRequest(false);

    await expect(hasPermission("users:disable")(request)).rejects.toMatchObject(
      {
        message: "Not have enough permission",
        payload: [
          {
            reason: {
              expectedToInclude: "users:disable",
              message: "Not have enough permission",
            },
          },
        ],
        type: "INVALID_CLAIMS",
      },
    );
  });

  it("throws a SuperTokens error, which SuperTokens turns into a 403", async () => {
    const { request } = buildRequest(false);

    await expect(hasPermission("roles:update")(request)).rejects.toBeInstanceOf(
      STError,
    );
  });

  it("passes what the context function returns, also from an async one", async () => {
    const { check, request } = buildRequest(true);

    await hasPermission("report.edit", { context: () => ({ orgId: 7 }) })(
      request,
    );
    await hasPermission("report.edit", {
      context: async (r) => ({ userId: r.user?.id }),
    })(request);

    expect(check.mock.calls[0]).toEqual(["report.edit", { orgId: 7 }]);
    expect(check.mock.calls[1]).toEqual(["report.edit", { userId: "user-1" }]);
  });

  it("fails the request when the check throws, never allowing it", async () => {
    const { request } = buildRequest(new Error("database down"));

    await expect(hasPermission("report.view")(request)).rejects.toThrow(
      "database down",
    );
  });
});
