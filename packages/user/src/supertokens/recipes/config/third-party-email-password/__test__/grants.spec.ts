import type { FastifyInstance } from "fastify";
import type {
  APIInterface,
  RecipeInterface,
} from "supertokens-node/recipe/thirdpartyemailpassword/types";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../../lib/getUserService", () => ({ default: vi.fn() }));
vi.mock("../../../../utils/areRolesExist", () => ({
  default: vi.fn().mockResolvedValue(true),
}));
vi.mock("supertokens-node/recipe/userroles", () => ({
  default: { addRoleToUser: vi.fn().mockResolvedValue({ status: "OK" }) },
}));

import getUserService from "../../../../../lib/getUserService";
import emailPasswordSignIn from "../emailPasswordSignIn";
import emailPasswordSignUp from "../emailPasswordSignUp";
import thirdPartySignInUpPOST from "../thirdPartySignInUpPost";

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

const grants = [{ permission: "report.view" }];

const makeFastify = (getGrants?: unknown) =>
  ({
    config: { user: { accessControl: { getGrants }, supertokens: {} } },
    log: { error: vi.fn() },
    slonik: {},
  }) as unknown as FastifyInstance;

beforeEach(() => {
  vi.mocked(getUserService).mockReturnValue({
    create: vi.fn().mockResolvedValue({ ...userRecord }),
    findById: vi.fn().mockResolvedValue({ ...userRecord }),
    update: vi.fn().mockResolvedValue({ ...userRecord }),
  } as unknown as ReturnType<typeof getUserService>);
});

const signIn = (fastify: FastifyInstance) => {
  const original = {
    emailPasswordSignIn: vi
      .fn()
      .mockResolvedValue({ status: "OK", user: supertokensUser }),
  } as unknown as RecipeInterface;

  return emailPasswordSignIn(
    original,
    fastify,
  )({
    email: "user@example.com",
    password: "secret",
    userContext: {},
  });
};

const signUp = (fastify: FastifyInstance) => {
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
    userContext: { roles: ["USER"] },
  });
};

const thirdPartySignIn = (fastify: FastifyInstance) => {
  const original = {
    thirdPartySignInUpPOST: vi.fn().mockResolvedValue({
      createdNewUser: false,
      status: "OK",
      user: supertokensUser,
    }),
  } as unknown as APIInterface;

  const post = thirdPartySignInUpPOST(original, fastify);

  if (!post) {
    throw new Error("thirdPartySignInUpPOST is not defined");
  }

  return post({
    userContext: { _default: { request: { request: {} } } },
  } as unknown as Parameters<typeof post>[0]);
};

describe.each([
  ["email and password sign-in", signIn],
  ["email and password sign-up", signUp],
  ["third-party sign-in", thirdPartySignIn],
])("%s", (_name, run) => {
  it("returns the user without grants when getGrants is not configured", async () => {
    const response = await run(makeFastify());

    expect(response.status).toBe("OK");
    expect((response as { user: object }).user).not.toHaveProperty("grants");
  });

  it("returns the user with grants when getGrants is configured", async () => {
    const getGrants = vi.fn().mockResolvedValue(grants);

    const response = await run(makeFastify(getGrants));

    expect((response as { user: object }).user).toMatchObject({
      email: "user@example.com",
      grants,
      id: "user-1",
    });
    expect(getGrants).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1" }),
      expect.anything(),
    );
  });

  it("fails when getGrants throws", async () => {
    const getGrants = vi.fn().mockRejectedValue(new Error("database down"));

    await expect(run(makeFastify(getGrants))).rejects.toThrow("database down");
  });
});
