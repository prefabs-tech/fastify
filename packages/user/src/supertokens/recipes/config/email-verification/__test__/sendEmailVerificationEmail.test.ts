import type { FastifyInstance } from "fastify";

import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import sendEmailVerificationEmail from "../sendEmailVerificationEmail.js";

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

type Input = Parameters<ReturnType<typeof sendEmailVerificationEmail>>[0];

const buildInput = (userContext: unknown) =>
  ({
    emailVerifyLink:
      "https://default.example.com/auth/verify-email?token=t&rid=emailverification",
    type: "EMAIL_VERIFICATION",
    user: { email: "user@example.com", id: "user-1" },
    userContext,
  }) as unknown as Input;

const withRequest = (request: Record<string, unknown>) => ({
  _default: { request: { request } },
});

const referer = { referer: "https://web.example.com/signup" };

const send = async (fastify: FastifyInstance, userContext: unknown) =>
  sendEmailVerificationEmail({} as never, fastify)(buildInput(userContext));

const getLinkSent = (sendMail: ReturnType<typeof vi.fn>) =>
  sendMail.mock.calls[0][0].templateData.emailVerifyLink;

describe("sendEmailVerificationEmail", () => {
  let fastify: FastifyInstance;

  afterEach(async () => {
    await fastify.close();
  });

  it("uses the app's origin and emailVerification path and keeps the supertokens query", async () => {
    const built = buildFastify([appWithPaths]);

    fastify = built.fastify;

    await send(
      fastify,
      withRequest({ headers: referer, query: { appId: "2" } }),
    );

    expect(getLinkSent(built.sendMail)).toBe(
      "https://app.example.com/#/verify-email?token=t&rid=emailverification",
    );
  });

  it.each([
    [{}, "https://app.example.com/verify-email?token=t&rid=emailverification"],
    [
      { emailVerificationPath: "/confirm" },
      "https://app.example.com/confirm?token=t&rid=emailverification",
    ],
  ])(
    "uses the app's origin and the global path for an app without paths (%o)",
    async (supertokens, expected) => {
      const built = buildFastify([appWithoutPaths], supertokens);

      fastify = built.fastify;

      await send(
        fastify,
        withRequest({ headers: referer, query: { appId: "2" } }),
      );

      expect(getLinkSent(built.sendMail)).toBe(expected);
    },
  );

  it.each([
    {
      apps: [appWithPaths],
      case: "no appId",
      expected:
        "https://web.example.com/verify-email?token=t&rid=emailverification",
      request: { headers: referer, query: {} },
    },
    {
      apps: [appWithPaths],
      case: "an appId matching no app",
      expected:
        "https://web.example.com/verify-email?token=t&rid=emailverification",
      request: { headers: referer, query: { appId: "3" } },
    },
    {
      apps: [appWithPaths],
      case: "an appId that is not a number",
      expected:
        "https://web.example.com/verify-email?token=t&rid=emailverification",
      request: { headers: referer, query: { appId: "abc" } },
    },
    {
      apps: [{ ...appWithoutPaths, paths: { emailVerification: "" } }],
      case: "an app with an empty emailVerification path",
      expected:
        "https://app.example.com/verify-email?token=t&rid=emailverification",
      request: { headers: referer, query: { appId: "2" } },
    },
    {
      apps: [appWithPaths],
      case: "no appId and only an origin header",
      expected:
        "https://web2.example.com/verify-email?token=t&rid=emailverification",
      request: { headers: { origin: "https://web2.example.com" }, query: {} },
    },
    {
      apps: [appWithPaths],
      case: "no appId and only a hostname",
      expected:
        "https://default.example.com/verify-email?token=t&rid=emailverification",
      request: { headers: {}, hostname: "api.example.com", query: {} },
    },
  ])(
    "falls back to the request origin and the global path with $case",
    async ({ apps, expected, request }) => {
      const built = buildFastify(apps);

      fastify = built.fastify;

      await send(fastify, withRequest(request));

      expect(getLinkSent(built.sendMail)).toBe(expected);
    },
  );

  it("falls back to appOrigin and the global path without a request", async () => {
    const built = buildFastify([appWithPaths]);

    fastify = built.fastify;

    await send(fastify, {});

    expect(getLinkSent(built.sendMail)).toBe(
      "https://default.example.com/verify-email?token=t&rid=emailverification",
    );
  });

  it("adds a leading slash to the app's emailVerification path", async () => {
    const built = buildFastify([
      { ...appWithoutPaths, paths: { emailVerification: "#/verify-email" } },
    ]);

    fastify = built.fastify;

    await send(
      fastify,
      withRequest({ headers: referer, query: { appId: "2" } }),
    );

    expect(getLinkSent(built.sendMail)).toBe(
      "https://app.example.com/#/verify-email?token=t&rid=emailverification",
    );
  });
});
