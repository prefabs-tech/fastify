import type { FastifyInstance } from "fastify";

import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Invitation } from "../../types/invitation.js";

import sendInvitation from "../sendInvitation.js";

const invitation: Invitation = {
  createdAt: Date.now(),
  email: "user@example.com",
  expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
  id: 1,
  invitedById: "inviter-id",
  role: "USER",
  token: "abc",
  updatedAt: Date.now(),
};

const appWithPaths = {
  id: 2,
  name: "flutter-web",
  origin: "https://app.example.com",
  paths: {
    emailVerification: "/#/verify-email",
    invitationAccept: "/#/signup/token",
    resetPassword: "/#/reset-password",
  },
  supportedRoles: ["USER"],
};

const buildFastify = (config: Record<string, unknown> = {}) => {
  const fastify = Fastify({ logger: false });
  const sendMail = vi.fn().mockResolvedValue(undefined);

  fastify.decorate("config", {
    appName: "Test",
    appOrigin: ["https://default.example.com"],
    user: { supertokens: {} },
    ...config,
  });
  fastify.decorate("mailer", { sendMail });

  return { fastify, sendMail };
};

const getInvitationLinkSent = (sendMail: ReturnType<typeof vi.fn>) =>
  sendMail.mock.calls[0][0].templateData.invitationLink;

describe("sendInvitation", () => {
  let fastify: FastifyInstance;

  afterEach(async () => {
    await fastify.close();
  });

  it("sends the link built from the invitation's app origin and path", async () => {
    const built = buildFastify({ apps: [appWithPaths] });

    fastify = built.fastify;

    await sendInvitation(
      fastify,
      { ...invitation, appId: 2 },
      "https://other.example.com/page",
    );

    expect(getInvitationLinkSent(built.sendMail)).toBe(
      "https://app.example.com/#/signup/token/abc",
    );
  });

  it.each([
    [
      "https://web.example.com/invite",
      "https://web.example.com/signup/token/abc",
    ],
    ["api.example.com", "https://default.example.com/signup/token/abc"],
  ])("without an app, sends the link built from %s", async (url, expected) => {
    const built = buildFastify();

    fastify = built.fastify;

    await sendInvitation(fastify, invitation, url);

    expect(getInvitationLinkSent(built.sendMail)).toBe(expected);
  });
});
