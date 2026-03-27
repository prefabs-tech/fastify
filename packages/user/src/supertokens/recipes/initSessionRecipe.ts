import Session from "supertokens-node/recipe/session";

import getSessionRecipeConfig from "./config/sessionRecipeConfig";

import type { SupertokensRecipes } from "../types";
import type { FastifyInstance } from "fastify";

const init = (fastify: FastifyInstance) => {
  const session: SupertokensRecipes["session"] =
    fastify.config.user.supertokens!.recipes?.session;

  if (typeof session === "function") {
    return Session.init(session(fastify));
  }

  return Session.init(getSessionRecipeConfig(fastify));
};

export default init;
