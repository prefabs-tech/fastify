import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify";

import { describe, expect, it, vi } from "vitest";

vi.mock("supertokens-node/recipe/thirdpartyemailpassword", () => ({
  getUserById: vi.fn().mockResolvedValue({ thirdParty: undefined }),
}));

import me from "../handlers/me";

const user = {
  disabled: false,
  email: "user@example.com",
  id: "user-1",
  lastLoginAt: 0,
  signedUpAt: 0,
};

const callMe = async (getGrants?: unknown) => {
  const config = { user: { getGrants } };
  const send = vi.fn();
  const request = {
    config,
    server: { config },
    session: {},
    user,
  } as unknown as SessionRequest;

  await me(request, { send } as unknown as FastifyReply);

  return send.mock.calls[0][0];
};

describe("GET /me", () => {
  it("returns the user without grants when getGrants is not configured", async () => {
    expect(await callMe()).not.toHaveProperty("grants");
  });

  it("returns the user with grants when getGrants is configured", async () => {
    const grants = [{ permission: "report.view" }];
    const getGrants = vi.fn().mockResolvedValue(grants);

    expect(await callMe(getGrants)).toMatchObject({ grants, id: "user-1" });
    expect(getGrants).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1" }),
      expect.anything(),
    );
  });
});
