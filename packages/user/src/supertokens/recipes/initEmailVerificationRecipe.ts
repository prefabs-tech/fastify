import type { FastifyInstance } from "fastify";

import EmailVerification from "supertokens-node/recipe/emailverification/index.js";

import type { SupertokensRecipes } from "../types/index.js";

import getEmailVerificationRecipeConfig from "./config/emailVerificationRecipeConfig.js";

const init = (fastify: FastifyInstance) => {
  const emailVerification: SupertokensRecipes["emailVerification"] =
    fastify.config.user.supertokens.recipes?.emailVerification;

  if (typeof emailVerification === "function") {
    return EmailVerification.init(emailVerification(fastify));
  }

  return EmailVerification.init(getEmailVerificationRecipeConfig(fastify));
};

export default init;
