import type { FastifyInstance } from "fastify";

import Session from "supertokens-node/recipe/session/index.js";

import type { SupertokensRecipes } from "../types/index.js";

import getSessionRecipeConfig from "./config/sessionRecipeConfig.js";

const init = (fastify: FastifyInstance) => {
  const session: SupertokensRecipes["session"] =
    fastify.config.user.supertokens.recipes?.session;

  if (typeof session === "function") {
    return Session.init(session(fastify));
  }

  return Session.init(getSessionRecipeConfig(fastify));
};

export default init;
