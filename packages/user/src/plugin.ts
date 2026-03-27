import FastifyPlugin from "fastify-plugin";

import seedRoles from "./lib/seedRoles";
import mercuriusAuthPlugin from "./mercurius-auth/plugin";
import hasPermission from "./middlewares/hasPermission";
import runMigrations from "./migrations/runMigrations";
import invitationsRoutes from "./model/invitations/controller";
import permissionsRoutes from "./model/permissions/controller";
import rolesRoutes from "./model/roles/controller";
import usersRoutes from "./model/users/controller";
import supertokensPlugin from "./supertokens";
import userContext from "./userContext";

import type { GraphqlEnabledPlugin } from "@prefabs.tech/fastify-graphql";
import type { Database } from "@prefabs.tech/fastify-slonik";
import type { FastifyPluginAsync } from "fastify";

const userPlugin: FastifyPluginAsync = async (fastify) => {
  const { graphql, user } = fastify.config;

  if (user.authProvider === "better-auth") {
    // --- Better Auth path (POC) ---
    // Validates config, initializes BetterAuthProvider, registers /api/auth/*
    // and POC test routes at /poc/auth/*.
    if (!user.betterAuth) {
      throw new Error(
        '[fastify-user] authProvider is "better-auth" but config.user.betterAuth is missing. ' +
          "Provide { secret } in config.user.betterAuth.",
      );
    }

    // Reuse the same DB configuration that slonik is already connected to — no separate connectionString needed.
    const dbConfig = fastify.config.slonik;

    const { BetterAuthProvider } =
      await import("./auth/better-auth/betterAuthProvider");
    const { runBetterAuthMigrations } =
      await import("./auth/better-auth/migrate");
    const { default: pocRoutes } = await import("./auth/better-auth/pocRoutes");

    const authProvider = new BetterAuthProvider(user.betterAuth, dbConfig);

    // Run general migrations FIRST to add BetterAuth columns to users table
    await runMigrations(fastify.config, fastify.slonik);

    // Then run BetterAuth-specific migrations and data migration
    const db: Database = fastify.slonik;
    await runBetterAuthMigrations(user.betterAuth, dbConfig, db);

    // Register /api/auth/* handler
    await authProvider.bootstrap(fastify);

    // Register /poc/auth/* test routes
    await fastify.register(pocRoutes, { auth: authProvider });

    fastify.decorate("authProvider", authProvider);

    // For better-auth, we don't seed roles via SuperTokens; user_roles table is empty.
    // Roles will be assigned via API endpoints (e.g., POST /users/:id/roles).
  } else {
    // --- SuperTokens path (default, unchanged) ---
    await fastify.register(supertokensPlugin);

    fastify.addHook("onReady", async () => {
      await seedRoles(user);
    });

    // Run general migrations for SuperTokens path
    await runMigrations(fastify.config, fastify.slonik);
  }

  fastify.decorate("hasPermission", hasPermission);

  if (graphql?.enabled) {
    await fastify.register(mercuriusAuthPlugin);
  }

  const { routePrefix, routes } = user;

  if (!routes?.invitations?.disabled) {
    await fastify.register(invitationsRoutes, { prefix: routePrefix });
  }

  if (!routes?.permissions?.disabled) {
    await fastify.register(permissionsRoutes, { prefix: routePrefix });
  }

  if (!routes?.roles?.disabled) {
    await fastify.register(rolesRoutes, { prefix: routePrefix });
  }

  if (!routes?.users?.disabled) {
    await fastify.register(usersRoutes, { prefix: routePrefix });
  }
};

const plugin = Object.assign(FastifyPlugin(userPlugin), {
  updateContext: userContext,
}) satisfies GraphqlEnabledPlugin;

export default plugin;
