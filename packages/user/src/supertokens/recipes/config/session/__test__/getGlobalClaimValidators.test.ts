import type { FastifyContextConfig, FastifyInstance } from "fastify";
import type { SessionClaimValidator } from "supertokens-node/recipe/session";
import type { RecipeInterface } from "supertokens-node/recipe/session/types";

import Fastify from "fastify";
import SuperTokens from "supertokens-node";
import { EmailVerificationClaim } from "supertokens-node/recipe/emailverification";
import Session from "supertokens-node/recipe/session";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import ProfileValidationClaim from "../../../../utils/profileValidationClaim";
import getGlobalClaimValidators from "../getGlobalClaimValidators";

const emailVerificationValidator = {
  id: EmailVerificationClaim.key,
} as SessionClaimValidator;

const otherValidator = { id: "other" } as SessionClaimValidator;

const buildFastify = (
  routeConfig: FastifyContextConfig,
  profileValidationEnabled = false,
) => {
  const fastify = Fastify({ logger: false });

  const config = {
    user: {
      features: { profileValidation: { enabled: profileValidationEnabled } },
    },
  };

  fastify.decorate("config", config);

  fastify.addHook("onRequest", async (request) => {
    request.config = config as typeof request.config;
  });

  fastify.get("/test", { config: routeConfig }, async (request) => {
    const validators = await getGlobalClaimValidators(
      {
        getGlobalClaimValidators: async () => [],
      } as unknown as RecipeInterface,
      fastify,
    )({
      claimValidatorsAddedByOtherRecipes: [
        emailVerificationValidator,
        otherValidator,
      ],
      recipeUserId: {} as never,
      tenantId: "public",
      userContext: { _default: { request: { original: request } } },
      userId: "user-id",
    });

    return validators.map((validator) => validator.id);
  });

  return fastify;
};

describe("getGlobalClaimValidators", () => {
  let fastify: FastifyInstance;

  beforeAll(() => {
    SuperTokens.init({
      appInfo: {
        apiDomain: "http://localhost",
        appName: "test",
        websiteDomain: "http://localhost",
      },
      framework: "fastify",
      recipeList: [Session.init()],
      supertokens: { connectionURI: "http://localhost:3567" },
    });
  });

  afterEach(async () => {
    await fastify.close();
  });

  it("keeps the email verification claim when the route has no verified flag", async () => {
    fastify = buildFastify({});

    const response = await fastify.inject({ method: "GET", url: "/test" });

    expect(response.json()).toEqual([EmailVerificationClaim.key, "other"]);
  });

  it("keeps the email verification claim when verified is true", async () => {
    fastify = buildFastify({ verified: true });

    const response = await fastify.inject({ method: "GET", url: "/test" });

    expect(response.json()).toEqual([EmailVerificationClaim.key, "other"]);
  });

  it("drops only the email verification claim when verified is false", async () => {
    fastify = buildFastify({ verified: false });

    const response = await fastify.inject({ method: "GET", url: "/test" });

    expect(response.json()).toEqual(["other"]);
  });

  it("still enforces profile validation when verified is false", async () => {
    fastify = buildFastify({ verified: false }, true);

    const response = await fastify.inject({ method: "GET", url: "/test" });

    expect(response.json()).toEqual(["other", ProfileValidationClaim.key]);
  });

  it("drops the profile validation claim when profileValidated is false", async () => {
    fastify = buildFastify({ profileValidated: false }, true);

    const response = await fastify.inject({ method: "GET", url: "/test" });

    expect(response.json()).toEqual([EmailVerificationClaim.key, "other"]);
  });

  it("drops both claims when verified and profileValidated are false", async () => {
    fastify = buildFastify({ profileValidated: false, verified: false }, true);

    const response = await fastify.inject({ method: "GET", url: "/test" });

    expect(response.json()).toEqual(["other"]);
  });
});
