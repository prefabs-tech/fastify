import { getMigrations } from "better-auth/db";
import { sql, stringifyDsn } from "slonik";

import { createAuth } from "./auth";

import type { BetterAuthConfig } from "../../types/config";
import type { Database, SlonikOptions } from "@prefabs.tech/fastify-slonik";

/**
 * Run Better Auth migrations + create our own user_roles table via slonik.
 *
 * Called from plugin.ts on startup when authProvider === "better-auth".
 * Safe to call on every startup — all statements are CREATE IF NOT EXISTS.
 *
 * Better Auth manages its own tables (user, session, account, verification,
 * phone_number) using its internal connection. Our user_roles table is
 * created via slonik, the same connection pool used by the rest of the app.
 */
export async function runBetterAuthMigrations(
  config: BetterAuthConfig,
  dbConfig: SlonikOptions,
  database: Database,
): Promise<void> {
  // Better Auth tables — uses better-auth's own internal pg connection
  const connectionString = stringifyDsn(dbConfig.db);
  const auth = createAuth(config, connectionString);
  const { runMigrations } = await getMigrations(auth.options);
  await runMigrations();

  // user_roles table — provider-agnostic, managed via slonik
  await database.connect(async (connection) => {
    await connection.query(sql.unsafe`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id  TEXT NOT NULL,
        role     TEXT NOT NULL,
        PRIMARY KEY (user_id, role)
      )
    `);
  });
}
