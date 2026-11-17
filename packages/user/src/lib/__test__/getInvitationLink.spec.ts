import type { ApiConfig } from "@prefabs.tech/fastify-config";

import { describe, expect, it } from "vitest";

import type { Invitation } from "../../types/invitation.js";

import { INVITATION_ACCEPT_LINK_PATH } from "../../constants.js";
import getInvitationLink from "../getInvitationLink.js";

const baseInvitation: Invitation = {
  createdAt: Date.now(),
  email: "user@example.com",
  expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
  id: 1,
  invitedById: "inviter-id",
  role: "USER",
  token: "test-uuid-token",
  updatedAt: Date.now(),
};

const baseConfig = {
  user: {},
} as unknown as ApiConfig;

describe("getInvitationLink", () => {
  it("uses the default accept link path when not configured", () => {
    const link = getInvitationLink(
      baseConfig,
      baseInvitation,
      "https://app.example.com",
    );

    expect(link).toBe(
      `https://app.example.com/signup/token/${baseInvitation.token}`,
    );
  });

  it("substitutes the invitation token into the default path", () => {
    const invitation: Invitation = {
      ...baseInvitation,
      token: "my-special-token",
    };

    const link = getInvitationLink(
      baseConfig,
      invitation,
      "https://app.example.com",
    );

    expect(link).toContain("my-special-token");
    expect(link).not.toContain(":token");
  });

  it("uses custom acceptLinkPath from config", () => {
    const config = {
      user: {
        invitation: { acceptLinkPath: "/onboarding/accept/:token" },
      },
    } as unknown as ApiConfig;

    const link = getInvitationLink(
      config,
      baseInvitation,
      "https://app.example.com",
    );

    expect(link).toBe(
      `https://app.example.com/onboarding/accept/${baseInvitation.token}`,
    );
  });

  it("preserves origin correctly in the returned URL", () => {
    const link = getInvitationLink(
      baseConfig,
      baseInvitation,
      "https://staging.myapp.io",
    );

    expect(link.startsWith("https://staging.myapp.io/")).toBe(true);
  });

  it("replaces all occurrences of :token in the path", () => {
    const config = {
      user: {
        invitation: { acceptLinkPath: "/a/:token/verify/:token" },
      },
    } as unknown as ApiConfig;

    const link = getInvitationLink(
      config,
      baseInvitation,
      "https://app.example.com",
    );

    expect(link).toBe(
      `https://app.example.com/a/${baseInvitation.token}/verify/${baseInvitation.token}`,
    );
  });

  it("does not replace :token when followed by a word character", () => {
    const config = {
      user: {
        invitation: { acceptLinkPath: "/invite/:tokenizer" },
      },
    } as unknown as ApiConfig;

    const link = getInvitationLink(
      config,
      baseInvitation,
      "https://app.example.com",
    );

    // :tokenizer should NOT be replaced
    expect(link).toContain(":tokenizer");
    expect(link).not.toContain(baseInvitation.token);
  });

  it("default INVITATION_ACCEPT_LINK_PATH constant contains :token placeholder", () => {
    expect(INVITATION_ACCEPT_LINK_PATH).toContain(":token");
  });
});

const buildConfig = (
  apps: unknown[],
  invitationConfig: Record<string, unknown> = {},
) => ({ apps, user: { invitation: invitationConfig } }) as unknown as ApiConfig;

describe("getInvitationLink with per-app paths", () => {
  const origin = "https://app.example.com";

  const invitation: Invitation = { ...baseInvitation, token: "abc" };

  const appWithPaths = {
    id: 2,
    name: "flutter-web",
    origin,
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
    origin,
    supportedRoles: ["USER"],
  };

  it("appends the token to the app's invitationAccept path", () => {
    const link = getInvitationLink(
      buildConfig([appWithPaths]),
      { ...invitation, appId: 2 },
      origin,
    );

    expect(link).toBe("https://app.example.com/#/signup/token/abc");
  });

  it("prefers the app's path over acceptLinkPath", () => {
    const link = getInvitationLink(
      buildConfig([appWithPaths], { acceptLinkPath: "/join/:token" }),
      { ...invitation, appId: 2 },
      origin,
    );

    expect(link).toBe("https://app.example.com/#/signup/token/abc");
  });

  describe.each([
    {
      apps: [appWithPaths],
      case: "the invitation has no appId",
      invitation,
    },
    {
      apps: [appWithPaths],
      case: "the appId matches no app",
      invitation: { ...invitation, appId: 3 },
    },
    {
      apps: [appWithoutPaths],
      case: "the app has no paths",
      invitation: { ...invitation, appId: 2 },
    },
    {
      apps: [{ ...appWithoutPaths, paths: {} }],
      case: "the app has no invitationAccept path",
      invitation: { ...invitation, appId: 2 },
    },
    {
      apps: [{ ...appWithoutPaths, paths: { invitationAccept: "" } }],
      case: "the app's invitationAccept path is empty",
      invitation: { ...invitation, appId: 2 },
    },
  ])("when $case", ({ apps, invitation }) => {
    it("uses acceptLinkPath when it is set", () => {
      const link = getInvitationLink(
        buildConfig(apps, { acceptLinkPath: "/join/:token" }),
        invitation,
        origin,
      );

      expect(link).toBe("https://app.example.com/join/abc");
    });

    it("uses the default path otherwise", () => {
      const link = getInvitationLink(buildConfig(apps), invitation, origin);

      expect(link).toBe("https://app.example.com/signup/token/abc");
    });
  });

  it.each(["/#/signup/token/", "/#/signup/token//"])(
    "trims all trailing slashes of %s before the token",
    (invitationAccept) => {
      const link = getInvitationLink(
        buildConfig([{ ...appWithoutPaths, paths: { invitationAccept } }]),
        { ...invitation, appId: 2 },
        origin,
      );

      expect(link).toBe("https://app.example.com/#/signup/token/abc");
    },
  );

  it("does not replace a :token placeholder in the app's path", () => {
    const link = getInvitationLink(
      buildConfig([
        {
          ...appWithoutPaths,
          paths: { invitationAccept: "/#/signup/token/:token" },
        },
      ]),
      { ...invitation, appId: 2 },
      origin,
    );

    expect(link).toBe("https://app.example.com/#/signup/token/:token/abc");
  });

  it.each([
    ["#/signup/token", "https://app.example.com/#/signup/token/abc"],
    ["signup/token", "https://app.example.com/signup/token/abc"],
  ])("adds a leading slash to %s", (invitationAccept, expected) => {
    const link = getInvitationLink(
      buildConfig([{ ...appWithoutPaths, paths: { invitationAccept } }]),
      { ...invitation, appId: 2 },
      origin,
    );

    expect(link).toBe(expected);
  });

  it.each([2, 4])(
    "ignores a leftover acceptLinkPaths map for appId %i",
    (appId) => {
      const link = getInvitationLink(
        buildConfig([appWithoutPaths], {
          acceptLinkPaths: { 2: "/x/:token" },
        }),
        { ...invitation, appId },
        origin,
      );

      expect(link).toBe("https://app.example.com/signup/token/abc");
    },
  );
});
