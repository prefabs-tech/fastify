import type { FastifyPluginAsync } from "fastify";

import { addSupertokensRecipe } from "@prefabs.tech/fastify-user";
import FastifyPlugin from "fastify-plugin";

import initPasswordlessRecipe from "./recipe/initPasswordlessRecipe";

const passwordlessPlugin: FastifyPluginAsync = async (fastify) => {
  if (fastify.config.passwordless?.enabled === false) {
    fastify.log.info("fastify-passwordless plugin is not enabled");

    return;
  }

  fastify.log.info("Registering fastify-passwordless plugin");

  addSupertokensRecipe(fastify, initPasswordlessRecipe);
};

export default FastifyPlugin(passwordlessPlugin);
