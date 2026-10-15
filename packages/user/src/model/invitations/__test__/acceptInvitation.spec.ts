import type { FastifyReply, FastifyRequest } from "fastify";

import { describe, expect, it, vi } from "vitest";

vi.mock("supertokens-node/recipe/thirdpartyemailpassword", () => ({
  emailPasswordSignUp: vi.fn().mockResolvedValue({
    status: "OK",
    user: { email: "user@example.com", id: "user-1", timeJoined: 0 },
  }),
}));
vi.mock("supertokens-node/recipe/session", () => ({
  createNewSession: vi.fn(),
}));
vi.mock("../../../lib/getInvitationService", () => ({
  default: () => ({
    findByToken: vi
      .fn()
      .mockResolvedValue({ email: "user@example.com", id: 1, role: "USER" }),
    update: vi.fn(),
  }),
}));
vi.mock("../../../lib/isInvitationValid", () => ({ default: () => true }));
vi.mock("../../../validator/email", () => ({
  default: () => ({ success: true }),
}));
vi.mock("../../../validator/password", () => ({
  default: () => ({ success: true }),
}));

import acceptInvitation from "../handlers/acceptInvitation";

const accept = async (user: Record<string, unknown>) => {
  const send = vi.fn();
  const config = { user };
  const request = {
    body: { email: "user@example.com", password: "secret" },
    config,
    log: { error: vi.fn() },
    params: { token: "token" },
    server: { config },
  } as unknown as FastifyRequest;

  await acceptInvitation(request, { send } as unknown as FastifyReply);

  return send.mock.calls[0][0];
};

describe("accepting an invitation", () => {
  it("returns the user without grants when getGrants is not configured", async () => {
    const response = await accept({});

    expect(response.user).toMatchObject({ id: "user-1", roles: ["USER"] });
    expect(response.user).not.toHaveProperty("grants");
  });

  it("reads the grants after postAccept, which may have given some", async () => {
    let given: string[] = [];
    const postAccept = vi.fn(async () => {
      given = ["report.view"];
    });
    const getGrants = vi.fn(async () =>
      given.map((permission) => ({ permission })),
    );

    const response = await accept({
      accessControl: { getGrants },
      invitation: { postAccept },
    });

    expect(response.user).toMatchObject({
      grants: [{ permission: "report.view" }],
      id: "user-1",
      roles: ["USER"],
    });
  });
});
