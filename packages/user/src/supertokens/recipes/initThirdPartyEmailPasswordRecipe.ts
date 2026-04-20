import type { FastifyInstance } from "fastify";

import ThirdPartyEmailPassword from "supertokens-node/recipe/thirdpartyemailpassword";

import type { SupertokensRecipes } from "../types";

import getThirdPartyEmailPasswordRecipeConfig from "./config/thirdPartyEmailPasswordRecipeConfig";

const init = (fastify: FastifyInstance) => {
  const thirdPartyEmailPassword: SupertokensRecipes["thirdPartyEmailPassword"] =
    fastify.config.user.supertokens.recipes?.thirdPartyEmailPassword;

  if (typeof thirdPartyEmailPassword === "function") {
    return ThirdPartyEmailPassword.init(thirdPartyEmailPassword(fastify));
  }

  return ThirdPartyEmailPassword.init(
    getThirdPartyEmailPasswordRecipeConfig(fastify),
  );
};

export default init;
