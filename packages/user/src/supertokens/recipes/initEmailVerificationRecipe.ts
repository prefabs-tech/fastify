import EmailVerification from "supertokens-node/recipe/emailverification";

import getEmailVerificationRecipeConfig from "./config/emailVerificationRecipeConfig";

import type { SupertokensRecipes } from "../types";
import type { FastifyInstance } from "fastify";

const init = (fastify: FastifyInstance) => {
  const emailVerification: SupertokensRecipes["emailVerification"] =
    fastify.config.user.supertokens!.recipes?.emailVerification;

  if (typeof emailVerification === "function") {
    return EmailVerification.init(emailVerification(fastify));
  }

  return EmailVerification.init(getEmailVerificationRecipeConfig(fastify));
};

export default init;
