import type { AppConfig } from "@prefabs.tech/fastify-config";
import type { FastifyInstance } from "fastify";

import { describe, expectTypeOf, it } from "vitest";

import type { Invitation, UserConfig } from "../index.js";

import { sendInvitation } from "../index.js";

describe("config types", () => {
  it("adds an optional paths key with optional link paths to AppConfig", () => {
    const base = {
      id: 2,
      name: "flutter-web",
      origin: "https://app.example.com",
      supportedRoles: ["USER"],
    };

    const withPaths: AppConfig = {
      ...base,
      paths: {
        emailVerification: "/a",
        invitationAccept: "/b",
        resetPassword: "/c",
      },
    };
    const withEmptyPaths: AppConfig = { ...base, paths: {} };
    const withoutPaths: AppConfig = base;

    expectTypeOf(withPaths).toEqualTypeOf<AppConfig>();
    expectTypeOf(withEmptyPaths).toEqualTypeOf<AppConfig>();
    expectTypeOf(withoutPaths).toEqualTypeOf<AppConfig>();
    expectTypeOf<AppConfig["paths"]>().toEqualTypeOf<
      | undefined
      | {
          emailVerification?: string;
          invitationAccept?: string;
          resetPassword?: string;
        }
    >();
  });

  it("no longer accepts user.invitation.acceptLinkPaths", () => {
    const invitation: UserConfig["invitation"] = {
      // @ts-expect-error acceptLinkPaths was removed in favour of apps[].paths
      acceptLinkPaths: { 2: "/x/:token" },
    };

    expectTypeOf(invitation).toEqualTypeOf<UserConfig["invitation"]>();
  });

  it("keeps the signature of sendInvitation", () => {
    expectTypeOf(sendInvitation).parameters.toEqualTypeOf<
      [FastifyInstance, Invitation, string?]
    >();
  });

  it("keeps the global link path options", () => {
    const user: Pick<UserConfig, "invitation" | "supertokens"> = {
      invitation: { acceptLinkPath: "/join/:token" },
      supertokens: {
        connectionUri: "http://localhost:3567",
        emailVerificationPath: "/confirm",
        resetPasswordPath: "/auth/reset",
      },
    };

    expectTypeOf(user.invitation?.acceptLinkPath).toEqualTypeOf<
      string | undefined
    >();
  });
});
