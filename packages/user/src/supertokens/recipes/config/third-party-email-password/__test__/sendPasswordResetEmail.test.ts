import type { FastifyInstance } from "fastify";

import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import sendPasswordResetEmail from "../sendPasswordResetEmail.js";

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

const appWithoutPaths = {
  id: 2,
  name: "flutter-web",
  origin: "https://app.example.com",
  supportedRoles: ["USER"],
};

const buildFastify = (
  apps: unknown[] = [],
  supertokens: Record<string, unknown> = {},
) => {
  const fastify = Fastify({ logger: false });
  const sendMail = vi.fn().mockResolvedValue(undefined);

  fastify.decorate("config", {
    appName: "Test",
    appOrigin: ["https://default.example.com"],
    apps,
    user: { supertokens },
  });
  fastify.decorate("mailer", { sendMail });

  return { fastify, sendMail };
};

const buildInput = (query: Record<string, string> = {}) =>
  ({
    passwordResetLink:
      "https://default.example.com/auth/reset-password?token=t&rid=thirdpartyemailpassword",
    user: { email: "user@example.com", id: "user-1" },
    userContext: {
      _default: {
        request: {
          request: {
            headers: { referer: "https://web.example.com/login" },
            hostname: "api.example.com",
            query,
          },
        },
      },
    },
  }) as unknown as Parameters<ReturnType<typeof sendPasswordResetEmail>>[0];

const send = async (fastify: FastifyInstance, query?: Record<string, string>) =>
  sendPasswordResetEmail({} as never, fastify)(buildInput(query));

const getLinkSent = (sendMail: ReturnType<typeof vi.fn>) =>
  sendMail.mock.calls[0][0].templateData.passwordResetLink;

describe("sendPasswordResetEmail", () => {
  let fastify: FastifyInstance;

  afterEach(async () => {
    await fastify.close();
  });

  it("uses the app's resetPassword path and keeps the supertokens query", async () => {
    const built = buildFastify([appWithPaths]);

    fastify = built.fastify;

    await send(fastify, { appId: "2" });

    expect(getLinkSent(built.sendMail)).toBe(
      "https://app.example.com/#/reset-password?token=t&rid=thirdpartyemailpassword",
    );
  });

  it.each([
    {
      apps: [appWithPaths],
      case: "no appId",
      expected:
        "https://web.example.com/reset-password?token=t&rid=thirdpartyemailpassword",
      query: {},
    },
    {
      apps: [appWithPaths],
      case: "an appId matching no app",
      expected:
        "https://web.example.com/reset-password?token=t&rid=thirdpartyemailpassword",
      query: { appId: "3" },
    },
    {
      apps: [appWithPaths],
      case: "an appId that is not a number",
      expected:
        "https://web.example.com/reset-password?token=t&rid=thirdpartyemailpassword",
      query: { appId: "abc" },
    },
    {
      apps: [appWithoutPaths],
      case: "an app without paths",
      expected:
        "https://app.example.com/reset-password?token=t&rid=thirdpartyemailpassword",
      query: { appId: "2" },
    },
    {
      apps: [{ ...appWithoutPaths, paths: { resetPassword: "" } }],
      case: "an app with an empty resetPassword path",
      expected:
        "https://app.example.com/reset-password?token=t&rid=thirdpartyemailpassword",
      query: { appId: "2" },
    },
    {
      apps: [appWithPaths],
      case: "no appId and a global resetPasswordPath",
      expected:
        "https://web.example.com/auth/reset?token=t&rid=thirdpartyemailpassword",
      query: {},
      supertokens: { resetPasswordPath: "/auth/reset" },
    },
  ])(
    "falls back to the global path with $case",
    async ({ apps, expected, query, supertokens }) => {
      const built = buildFastify(apps, supertokens);

      fastify = built.fastify;

      await send(fastify, query);

      expect(getLinkSent(built.sendMail)).toBe(expected);
    },
  );

  it("adds a leading slash to the app's resetPassword path", async () => {
    const built = buildFastify([
      { ...appWithoutPaths, paths: { resetPassword: "#/reset-password" } },
    ]);

    fastify = built.fastify;

    await send(fastify, { appId: "2" });

    expect(getLinkSent(built.sendMail)).toBe(
      "https://app.example.com/#/reset-password?token=t&rid=thirdpartyemailpassword",
    );
  });
});
