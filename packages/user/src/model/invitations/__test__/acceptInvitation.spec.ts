import type { FastifyReply, FastifyRequest } from "fastify";
import type { MercuriusContext } from "mercurius";

import { emailPasswordSignUp } from "supertokens-node/recipe/thirdpartyemailpassword";
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

import invitationResolver from "../graphql/resolver";
import acceptInvitation from "../handlers/acceptInvitation";

const makeRequest = (user: Record<string, unknown>) => {
  const config = { user };

  return {
    body: { email: "user@example.com", password: "secret" },
    config,
    log: { error: vi.fn() },
    params: { token: "token" },
    server: { config },
  } as unknown as FastifyRequest;
};

const accept = async (user: Record<string, unknown>) => {
  const send = vi.fn();

  await acceptInvitation(makeRequest(user), {
    send,
  } as unknown as FastifyReply);

  return send.mock.calls[0][0];
};

describe("accepting an invitation, passing the request into sign-up", () => {
  it("passes it over REST, so roleMap can give roles", async () => {
    const request = makeRequest({});

    await acceptInvitation(request, {
      send: vi.fn(),
    } as unknown as FastifyReply);

    expect(emailPasswordSignUp).toHaveBeenLastCalledWith(
      "user@example.com",
      "secret",
      {
        _default: { request: { request } },
        autoVerifyEmail: true,
        roles: ["USER"],
      },
    );
  });

  it("passes it in GraphQL, so roleMap can give roles", async () => {
    const request = makeRequest({});
    const context = {
      app: { log: { error: vi.fn() } },
      config: request.config,
      reply: { request },
    } as unknown as MercuriusContext;

    await invitationResolver.Mutation.acceptInvitation(
      undefined,
      {
        data: { email: "user@example.com", password: "secret" },
        token: "token",
      },
      context,
    );

    expect(emailPasswordSignUp).toHaveBeenLastCalledWith(
      "user@example.com",
      "secret",
      {
        _default: { request: { request } },
        autoVerifyEmail: true,
        roles: ["USER"],
      },
    );
  });
});

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
