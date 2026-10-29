import type { FastifyInstance } from "fastify";
import type { RecipeInterface } from "supertokens-node/recipe/thirdpartyemailpassword/types";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../../lib/getUserService", () => ({ default: vi.fn() }));
vi.mock("../../../../utils/areRolesExist", () => ({
  default: vi.fn().mockResolvedValue(true),
}));
vi.mock("supertokens-node/recipe/userroles", () => ({
  default: { addRoleToUser: vi.fn().mockResolvedValue({ status: "OK" }) },
}));
vi.mock("supertokens-node/recipe/thirdpartyemailpassword", () => ({
  getUserByThirdPartyInfo: vi.fn(),
}));

import getUserService from "../../../../../lib/getUserService";
import emailPasswordSignUp from "../emailPasswordSignUp";
import thirdPartySignInUp from "../thirdPartySignInUp";

const supertokensUser = {
  email: "user@example.com",
  id: "user-1",
  timeJoined: 0,
};

const userRecord = {
  disabled: false,
  email: "user@example.com",
  id: "user-1",
  lastLoginAt: 0,
  signedUpAt: 0,
};

const request = { dbSchema: undefined, id: "request-1" };

const roleMap = { ADMIN: ["user-admin"], USER: [] };

const create = vi.fn();

const makeAdmin = () => ({
  getUserRoles: vi.fn().mockResolvedValue([]),
  setUserRoles: vi.fn(
    async (_request: unknown, _userId: string, roles: string[]) => roles,
  ),
});

const makeFastify = (accessControl?: Record<string, unknown>) =>
  ({
    config: { user: { accessControl, supertokens: {} } },
    httpErrors: { notFound: (message: string) => new Error(message) },
    log: { error: vi.fn(), warn: vi.fn() },
    slonik: {},
  }) as unknown as FastifyInstance;

beforeEach(() => {
  create.mockClear().mockResolvedValue({ ...userRecord });

  vi.mocked(getUserService).mockReturnValue({
    create,
    update: vi.fn().mockResolvedValue({ ...userRecord }),
  } as unknown as ReturnType<typeof getUserService>);
});

const signUp = (fastify: FastifyInstance, userContext: object) => {
  const original = {
    emailPasswordSignUp: vi
      .fn()
      .mockResolvedValue({ status: "OK", user: { ...supertokensUser } }),
  } as unknown as RecipeInterface;

  return emailPasswordSignUp(
    original,
    fastify,
  )({
    email: "user@example.com",
    password: "secret",
    userContext,
  });
};

const socialSignUp = (fastify: FastifyInstance, createdNewUser: boolean) => {
  const original = {
    thirdPartySignInUp: vi.fn().mockResolvedValue({
      createdNewUser,
      status: "OK",
      user: { ...supertokensUser },
    }),
  } as unknown as RecipeInterface;

  return thirdPartySignInUp(
    original,
    fastify,
  )({
    email: "user@example.com",
    thirdPartyId: "google",
    thirdPartyUserId: "google-1",
    userContext: { _default: { request: { request } }, roles: ["ADMIN"] },
  } as unknown as Parameters<RecipeInterface["thirdPartySignInUp"]>[0]);
};

describe("email and password sign-up with roleMap", () => {
  it("gives the mapped roles with the request from the user context", async () => {
    const admin = makeAdmin();

    const response = await signUp(makeFastify({ admin, roleMap }), {
      _default: { request: { request } },
      roles: ["ADMIN"],
    });

    expect(response.status).toBe("OK");
    expect(admin.setUserRoles).toHaveBeenCalledWith(request, "user-1", [
      "user-admin",
    ]);
  });

  it("gives them before the response's grants are read", async () => {
    const admin = makeAdmin();
    const getGrants = vi.fn(async () => {
      expect(admin.setUserRoles).toHaveBeenCalledOnce();

      return [{ permission: "users.list" }];
    });

    const response = await signUp(makeFastify({ admin, getGrants, roleMap }), {
      _default: { request: { request } },
      roles: ["ADMIN"],
    });

    expect(getGrants).toHaveBeenCalledOnce();
    expect((response as { user: object }).user).toMatchObject({
      grants: [{ permission: "users.list" }],
    });
  });

  it("signs up, giving no library roles, when called without a request", async () => {
    const admin = makeAdmin();
    const fastify = makeFastify({ admin, roleMap });

    const response = await signUp(fastify, { roles: ["ADMIN"] });

    expect(response.status).toBe("OK");
    expect(admin.getUserRoles).not.toHaveBeenCalled();
    expect(fastify.log.warn).toHaveBeenCalledOnce();
  });

  it("signs up when giving the roles fails, logging the error", async () => {
    const admin = makeAdmin();
    admin.setUserRoles.mockRejectedValue(new Error("database down"));
    const fastify = makeFastify({ admin, roleMap });

    const response = await signUp(fastify, {
      _default: { request: { request } },
      roles: ["ADMIN"],
    });

    expect(response.status).toBe("OK");
    expect(fastify.log.error).toHaveBeenCalledOnce();
  });

  it("gives no library roles without roleMap", async () => {
    const admin = makeAdmin();

    await signUp(makeFastify({ admin }), {
      _default: { request: { request } },
      roles: ["ADMIN"],
    });

    expect(admin.getUserRoles).not.toHaveBeenCalled();
  });
});

describe("third-party sign-in with roleMap", () => {
  it("gives a new user the mapped roles after creating the user's row", async () => {
    const admin = makeAdmin();

    await socialSignUp(makeFastify({ admin, roleMap }), true);

    expect(admin.setUserRoles).toHaveBeenCalledWith(request, "user-1", [
      "user-admin",
    ]);
    expect(create.mock.invocationCallOrder[0]).toBeLessThan(
      admin.getUserRoles.mock.invocationCallOrder[0],
    );
  });

  it("gives an existing user nothing", async () => {
    const admin = makeAdmin();

    await socialSignUp(makeFastify({ admin, roleMap }), false);

    expect(admin.getUserRoles).not.toHaveBeenCalled();
  });
});
