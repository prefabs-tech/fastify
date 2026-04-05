import type { FastifyInstance } from "fastify";

import Session from "supertokens-node/recipe/session";

import type { SupertokensRecipes } from "../types";

import getSessionRecipeConfig from "./config/sessionRecipeConfig";

const init = (fastify: FastifyInstance) => {
  const session: SupertokensRecipes["session"] =
    fastify.config.user.supertokens.recipes?.session;

  if (typeof session === "function") {
    return Session.init(session(fastify));
  }

  return Session.init(getSessionRecipeConfig(fastify));
};

export default init;
