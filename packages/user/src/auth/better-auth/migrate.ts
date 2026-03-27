import { getMigrations } from "better-auth/db";
import { sql, stringifyDsn } from "slonik";

import { createAuth } from "./auth";

import type { BetterAuthConfig } from "../../types/config";
import type { Database, SlonikOptions } from "@prefabs.tech/fastify-slonik";

/**
 * Run Better Auth migrations + create our own user_roles table via slonik.
 *
 * Called from plugin.ts on startup when authProvider === "better-auth".
 * Safe to call on every startup — all statements are CREATE IF NOT EXISTS
 * or ADD COLUMN IF NOT EXISTS.
 *
 * Better Auth manages its own tables (user, session, account, verification,
 * phone_number) using its internal connection. Our user_roles table and
 * extra columns on the users table are managed via slonik.
 */
export async function runBetterAuthMigrations(
  config: BetterAuthConfig,
  dbConfig: SlonikOptions,
  database: Database,
): Promise<void> {
  // First, prepare the users table using slonik connection
  await database.connect(async (connection) => {
    // user_roles table — provider-agnostic, managed via slonik
    await connection.query(sql.unsafe`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id  TEXT NOT NULL,
        role     TEXT NOT NULL,
        PRIMARY KEY (user_id, role)
      )
    `);

    // Add missing columns one at a time (Slonik doesn't allow multiple statements)
    await connection.query(sql.unsafe`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE
    `);
    await connection.query(sql.unsafe`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS given_name TEXT
    `);
    await connection.query(sql.unsafe`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS middle_names TEXT
    `);
    await connection.query(sql.unsafe`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS surname TEXT
    `);
    await connection.query(sql.unsafe`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()
    `);
    await connection.query(sql.unsafe`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT
    `);
    await connection.query(sql.unsafe`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number_verified BOOLEAN DEFAULT FALSE
    `);

    // Fix any existing NULL values in email_verified BEFORE Better Auth runs
    await connection.query(sql.unsafe`
      UPDATE users SET email_verified = false WHERE email_verified IS NULL
    `);

    // Ensure email_verified is NOT NULL (Better Auth requirement)
    await connection.query(sql.unsafe`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'email_verified'
        ) THEN
          UPDATE users SET email_verified = false WHERE email_verified IS NULL;
          ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;
          ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT false;
        END IF;
      END $$;
    `);
  });

  // Run Better Auth migrations with its own internal connection
  // NOW our fixes are already in place
  const connectionString = stringifyDsn(dbConfig.db);
  const auth = createAuth(config, connectionString);
  const { runMigrations } = await getMigrations(auth.options);
  await runMigrations();
}
