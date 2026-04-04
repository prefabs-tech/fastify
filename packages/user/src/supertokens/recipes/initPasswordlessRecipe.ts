import { FastifyInstance } from "fastify";
import Passwordless from "supertokens-node/recipe/passwordless";

import getPasswordlessRecipeConfig from "./config/passwordlessRecipeConfig";

import type { SupertokensRecipes } from "../types";

const init = (fastify: FastifyInstance) => {
  const passwordless: SupertokensRecipes["passwordless"] =
    fastify.config.user.supertokens.recipes?.passwordless;

  if (typeof passwordless === "function") {
    return Passwordless.init(passwordless(fastify));
  }

  return Passwordless.init(getPasswordlessRecipeConfig(fastify));
};

export default init;
