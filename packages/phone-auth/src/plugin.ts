import type { FastifyPluginAsync } from "fastify";

import { addSupertokensRecipe } from "@prefabs.tech/fastify-user";
import FastifyPlugin from "fastify-plugin";

import extendUserSchema from "./graphql/extendUserSchema";
import runMigrations from "./migrations/runMigrations";
import initPasswordlessRecipe from "./recipe/initPasswordlessRecipe";

const phoneAuthPlugin: FastifyPluginAsync = async (fastify) => {
  if (fastify.config.phoneAuth?.enabled === false) {
    fastify.log.info("fastify-phone-auth plugin is not enabled");

    return;
  }

  fastify.log.info("Registering fastify-phone-auth plugin");

  addSupertokensRecipe(fastify, initPasswordlessRecipe);

  // The migration alters the users table, which @prefabs.tech/fastify-user
  // creates during its own registration — and this plugin has to be registered
  // BEFORE that one (see addSupertokensRecipe). onReady is the only point where
  // the table is guaranteed to exist.
  fastify.addHook("onReady", async () => {
    await runMigrations(fastify.config, fastify.slonik);
    await extendUserSchema(fastify);
  });
};

export default FastifyPlugin(phoneAuthPlugin);
