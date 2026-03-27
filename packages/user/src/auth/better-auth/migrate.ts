import { getMigrations } from "better-auth/db";
import { sql, stringifyDsn, type DatabasePoolConnection } from "slonik";

import { createAuth } from "./auth";

import type { BetterAuthConfig } from "../../types/config";
import type { Database, SlonikOptions } from "@prefabs.tech/fastify-slonik";

/**
 * Run Better Auth migrations + migrate data from SuperTokens.
 *
 * Called from plugin.ts on startup when authProvider === "better-auth".
 * Safe to call on every startup — all statements are idempotent.
 *
 * Better Auth manages its own tables (session, account, verification, phone_number)
 * using its internal connection. The 'user' table is our existing 'users' table.
 *
 * The migration order:
 * 1. Prepare users table schema (ensure columns exist and have correct types)
 * 2. Migrate data from SuperTokens (if transitioning)
 * 3. Run BetterAuth's own migrations
 */
export async function runBetterAuthMigrations(
  config: BetterAuthConfig,
  dbConfig: SlonikOptions,
  database: Database,
): Promise<void> {
  // Better Auth tables — uses better-auth's own internal pg connection
  const connectionString = stringifyDsn(dbConfig.db);
  const auth = createAuth(config, connectionString);

  // Prepare the users table schema and migrate user data BEFORE BetterAuth runs
  await database.connect(async (connection) => {
    // Ensure user_roles table exists
    await connection.query(sql.unsafe`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id  TEXT NOT NULL,
        role     TEXT NOT NULL,
        PRIMARY KEY (user_id, role)
      )
    `);

    // Prepare users table for BetterAuth
    await prepareUsersTable(connection);

    // Migrate user data from SuperTokens (user table only) - excludes account creation
    await migrateUserDataFromSuperTokens(connection);
  });

  // Now get the migration plan AFTER users table is prepared
  const { runMigrations } = await getMigrations(auth.options);

  // Run BetterAuth migrations (session, account, verification tables, etc.)
  // Note: 'user' table migrations are skipped due to disableMigrations: true in config
  await runMigrations();

  // After BetterAuth has created its tables (account, session, verification), migrate account data
  await database.connect(async (connection) => {
    await migrateAccountsFromSuperTokens(connection);
  });
}

/**
 * Prepare users table for BetterAuth compatibility.
 * This runs on every startup (idempotent).
 */
async function prepareUsersTable(
  connection: DatabasePoolConnection,
): Promise<void> {
  console.log("[BetterAuth] Preparing users table schema...");

  // 1. Ensure name column is nullable (in case previous runs added NOT NULL)
  await connection
    .query(sql.unsafe`ALTER TABLE users ALTER COLUMN name DROP NOT NULL`)
    .catch(() => {
      // Ignore if column doesn't exist or constraint doesn't exist
    });

  // 2. Change name column type from VARCHAR to TEXT for BetterAuth compatibility
  await connection
    .query(sql.unsafe`ALTER TABLE users ALTER COLUMN name TYPE TEXT`)
    .catch(() => {
      // Ignore if already TEXT or if alteration fails
    });

  // 3. Change email column type from VARCHAR to TEXT for BetterAuth compatibility
  await connection
    .query(sql.unsafe`ALTER TABLE users ALTER COLUMN email TYPE TEXT`)
    .catch(() => {
      // Ignore if already TEXT or if alteration fails
    });

  // 4. Populate name from email for any null/empty values
  await connection.query(
    sql.unsafe`UPDATE users SET name = email WHERE name IS NULL OR name = ''`,
  );

  // 4b. Ensure name is NOT NULL after population
  await connection
    .query(sql.unsafe`ALTER TABLE users ALTER COLUMN name SET NOT NULL`)
    .catch(() => {
      // Ignore if already NOT NULL or column doesn't exist
    });

  // 5. Ensure email_verified is NOT NULL and set NULLs to FALSE
  await connection.query(
    sql.unsafe`UPDATE users SET email_verified = FALSE WHERE email_verified IS NULL`,
  );

  // 6. Add NOT NULL constraint on email_verified (if not already present)
  await connection
    .query(
      sql.unsafe`ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL`,
    )
    .catch(() => {
      // Ignore if already NOT NULL or column doesn't exist
    });

  // 7. Ensure created_at is populated from signed_up_at where missing
  await connection.query(
    sql.unsafe`UPDATE users SET created_at = signed_up_at WHERE created_at IS NULL`,
  );

  // 8. Add NOT NULL constraint on created_at (since it has DEFAULT NOW())
  await connection
    .query(sql.unsafe`ALTER TABLE users ALTER COLUMN created_at SET NOT NULL`)
    .catch(() => {});

  // 9. Add NOT NULL constraint on updated_at (since it has DEFAULT NOW())
  await connection
    .query(sql.unsafe`ALTER TABLE users ALTER COLUMN updated_at SET NOT NULL`)
    .catch(() => {});

  // 10. Set defaults for snake_case timestamp columns (keep in sync with camelCase)
  await connection.query(
    sql.unsafe`
        ALTER TABLE users
        ALTER COLUMN created_at SET DEFAULT NOW(),
        ALTER COLUMN updated_at SET DEFAULT NOW();
      `,
  );

  // 11. Add BetterAuth's camelCase columns and sync them from snake_case
  // BetterAuth expects camelCase column names regardless of casing option (which only affects table names)
  // These must exist and have proper constraints to prevent migration errors.
  // Note: passwordHash and passwordLastUpdatedAt are NOT needed—password is stored in account table.
  await connection.query(
    sql.unsafe`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN,
        ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP;
      `,
  );

  // 12. Populate camelCase columns from their snake_case counterparts
  await connection.query(
    sql.unsafe`
      UPDATE users SET
        "emailVerified" = email_verified,
        "createdAt" = created_at,
        "updatedAt" = updated_at;
    `,
  );

  // 13. Set NOT NULL constraints on required camelCase columns (emailVerified, createdAt, updatedAt)
  await connection
    .query(
      sql.unsafe`
        ALTER TABLE users
        ALTER COLUMN "emailVerified" SET NOT NULL,
        ALTER COLUMN "createdAt" SET NOT NULL,
        ALTER COLUMN "updatedAt" SET NOT NULL;
      `,
    )
    .catch(() => {
      /* ignore if already set */
    });

  // 14. Set defaults for future inserts (camelCase columns)
  await connection.query(
    sql.unsafe`
      ALTER TABLE users
      ALTER COLUMN "emailVerified" SET DEFAULT FALSE,
      ALTER COLUMN "createdAt" SET DEFAULT NOW(),
      ALTER COLUMN "updatedAt" SET DEFAULT NOW();
    `,
  );

  console.log("[BetterAuth] Users table schema prepared");
}

/**
 * One-time migration: Copy user data from SuperTokens tables to our users table.
 * Only migrates email verification status. Password migration goes to account table.
 */
async function migrateUserDataFromSuperTokens(
  connection: DatabasePoolConnection,
): Promise<void> {
  // Check if SuperTokens tables still exist (we're transitioning from SuperTokens)
  const hasSuperTokens = await connection.maybeOne(sql.unsafe`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_name = 'st__emailpassword_users'
      AND table_schema = 'public'
    ) AS exists
  `);

  if (!hasSuperTokens?.exists) {
    console.log(
      "[BetterAuth] SuperTokens tables not found - skipping user data migration (fresh installation)",
    );
    return;
  }

  // Check if any users have not yet been verified (exist in st__emailverification_verified_emails)
  const needsMigration = await connection.maybeOne(sql.unsafe`
    SELECT EXISTS(
      SELECT 1
      FROM users u
      JOIN st__emailverification_verified_emails st ON u.id = st.user_id
      WHERE u.email_verified = FALSE
      LIMIT 1
    ) AS has_missing
  `);

  if (!needsMigration?.has_missing) {
    console.log(
      "[BetterAuth] All users already verified - skipping user data migration",
    );
    return;
  }

  console.log(
    "[BetterAuth] Migrating email verification status from SuperTokens...",
  );

  await connection.transaction(async (tx: DatabasePoolConnection) => {
    // Set email_verified = TRUE for users in st__emailverification_verified_emails
    await tx.query(sql.unsafe`
      UPDATE users u
      SET
        email_verified = TRUE,
        updated_at = NOW()
      FROM st__emailverification_verified_emails st
      WHERE u.id = st.user_id
        AND u.email_verified = FALSE
    `);

    // Log migration statistics
    const stats = await tx.one(sql.unsafe`
      SELECT
        COUNT(*) AS total_users,
        COUNT(*) FILTER (WHERE email_verified = TRUE) AS verified_users
      FROM users
    `);
    console.log("[BetterAuth] User data migration statistics:", stats);
  });

  console.log("[BetterAuth] SuperTokens user data migration completed");
}

/**
 * One-time migration: Create BetterAuth account records for existing email/password users.
 * This must run AFTER BetterAuth has created the account table.
 */
async function migrateAccountsFromSuperTokens(
  connection: DatabasePoolConnection,
): Promise<void> {
  console.log(
    "[BetterAuth] ===== Starting account migration from SuperTokens =====",
  );

  // Check if SuperTokens tables exist (only run if transitioning)
  const hasSuperTokens = await connection.maybeOne(sql.unsafe`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_name = 'st__emailpassword_users'
      AND table_schema = 'public'
    ) AS exists
  `);

  if (!hasSuperTokens?.exists) {
    console.log(
      "[BetterAuth] SuperTokens tables not found - skipping account migration (fresh installation)",
    );
    return;
  }

  console.log("[BetterAuth] ✓ SuperTokens tables found");

  // Diagnostic: Count users in st__emailpassword_users
  const stCount = (await connection
    .maybeOne(
      sql.unsafe`
    SELECT COUNT(*) as count FROM st__emailpassword_users
  `,
    )
    .catch(() => ({ count: 0 }))) as { count: number };
  console.log(
    `[BetterAuth] st__emailpassword_users has ${stCount.count} records`,
  );

  if (stCount.count === 0) {
    console.log("[BetterAuth] No SuperTokens users to migrate");
    return;
  }

  // Diagnostic: Show sample st__emailpassword_users data
  const sampleSt = (await connection
    .many(
      sql.unsafe`
    SELECT user_id, email, length(password_hash) as pwd_len, time_joined
    FROM st__emailpassword_users
    LIMIT 3
  `,
    )
    .catch(() => [])) as {
    user_id: string;
    email: string;
    pwd_len: number;
    time_joined: string;
  }[];
  console.log(
    "[BetterAuth] Sample st__emailpassword_users:",
    JSON.stringify(sampleSt, undefined, 2),
  );

  // Diagnostic: Check which of those users exist in users table
  if (sampleSt.length > 0) {
    const sampleIds = sampleSt.map((s) => `'${s.user_id}'`).join(",");
    const userExists = (await connection
      .many(
        sql.unsafe`
      SELECT id, email FROM users WHERE id IN (${sampleIds})
    `,
      )
      .catch(() => [])) as { id: string; email: string }[];
    console.log(
      "[BetterAuth] Matching users in users table:",
      JSON.stringify(userExists, undefined, 2),
    );
  }

  // Diagnostic: Check account table structure
  try {
    const tableInfo = (await connection
      .maybeOne(
        sql.unsafe`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns
      WHERE table_name = 'account'
      ORDER BY ordinal_position
    `,
      )
      .catch(() => {})) as
      | { column_name: string; is_nullable: string; data_type: string }
      | undefined;

    if (tableInfo) {
      console.log(
        "[BetterAuth] Account table columns:",
        JSON.stringify(tableInfo, undefined, 2),
      );
    }
  } catch (error) {
    console.log("[BetterAuth] Could not fetch account table structure:", error);
  }

  // Check which accounts already exist
  const existingAccountUsers = (await connection
    .many(
      sql.unsafe`
    SELECT "userId", "providerId" FROM "account" WHERE "providerId" = 'email' LIMIT 5
  `,
    )
    .catch(() => [])) as { userId: string; providerId: string }[];
  console.log(
    "[BetterAuth] Existing email accounts (sample):",
    JSON.stringify(existingAccountUsers, undefined, 2),
  );

  // Find users that need account migration (matching logic)
  const usersToMigrate = (await connection
    .many(
      sql.unsafe`
    SELECT st.user_id, st.email, length(st.password_hash) as pwd_len
    FROM st__emailpassword_users st
    WHERE EXISTS (SELECT 1 FROM users u WHERE u.id = st.user_id)
      AND st.user_id IS NOT NULL
      AND st.email IS NOT NULL
      AND st.password_hash IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "account" a
        WHERE a."userId" = st.user_id AND a."providerId" = 'email'
      )
    LIMIT 5
  `,
    )
    .catch(() => [])) as { user_id: string; email: string; pwd_len: number }[];

  console.log(
    `[BetterAuth] Users that need account migration: ${usersToMigrate.length}`,
  );
  if (usersToMigrate.length > 0) {
    console.log(
      "[BetterAuth] Sample users to migrate:",
      JSON.stringify(usersToMigrate, undefined, 2),
    );
  }

  if (usersToMigrate.length === 0) {
    console.log("[BetterAuth] No accounts need migration - all already exist");
    return;
  }

  // Diagnostic: Check account table schema
  try {
    const tableExists = await connection.maybeOne(sql.unsafe`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account' AND table_schema = 'public') AS exists
    `);
    console.log("[BetterAuth] Account table exists:", tableExists?.exists);

    if (tableExists?.exists) {
      const columns = (await connection.many(sql.unsafe`
        SELECT column_name, is_nullable, column_default, data_type
        FROM information_schema.columns
        WHERE table_name = 'account' AND table_schema = 'public'
        ORDER BY ordinal_position
      `)) as {
        column_name: string;
        is_nullable: string;
        column_default: string | null;
        data_type: string;
      }[];
      console.log(
        "[BetterAuth] Account table columns raw:",
        JSON.stringify(columns, undefined, 2),
      );

      // List NOT NULL columns
      const notNullCols = (await connection.many(sql.unsafe`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'account' AND table_schema = 'public' AND is_nullable = 'NO'
      `)) as { column_name: string }[];
      console.log(
        "[BetterAuth] NOT NULL columns:",
        JSON.stringify(notNullCols, undefined, 2),
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log("[BetterAuth] Schema check failed:", message);
  }

  console.log("[BetterAuth] Executing INSERT to create account records...");
  console.log(
    "[BetterAuth] About to insert accounts for users:",
    JSON.stringify(usersToMigrate, undefined, 2),
  );

  // Create account entries by reading directly from SuperTokens table
  // Include: id (primary key), userId, providerId, accountId (email), password, scope, createdAt, updatedAt
  // All NOT NULL columns are covered.
  // IMPORTANT: BetterAuth's email/password provider uses providerId = 'credential', not 'email'
  const result = await connection
    .query(
      sql.unsafe`
    INSERT INTO "account" ("id", "userId", "providerId", "accountId", "password", "scope", "createdAt", "updatedAt")
    SELECT
      gen_random_uuid() AS "id",
      st.user_id AS "userId",
      'credential' AS "providerId",
      st.email AS "accountId",
      st.password_hash AS "password",
      '' AS "scope",
      NOW() AS "createdAt",
      NOW() AS "updatedAt"
    FROM st__emailpassword_users st
    WHERE EXISTS (
      SELECT 1 FROM users u WHERE u.id = st.user_id
    )
      AND st.user_id IS NOT NULL
      AND st.email IS NOT NULL
      AND st.password_hash IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "account" a
        WHERE a."userId" = st.user_id AND a."providerId" = 'credential'
      )
    RETURNING *
  `,
    )
    .catch((error: unknown) => {
      const err = error as {
        message: string;
        detail?: string;
        hint?: string;
        code?: string;
        sqlState?: string;
      };
      console.error("[BetterAuth] ERROR during account insert:", {
        message: err.message,
        detail: err.detail,
        hint: err.hint,
        code: err.code,
        sqlState: err.sqlState,
      });
      // Also log what we tried to insert
      console.error(
        "[BetterAuth] Failed to insert accounts for users:",
        usersToMigrate,
      );
      throw error;
    });

  console.log(
    `[BetterAuth] ✓ Successfully created ${result.rowCount} account records for email/password users`,
  );

  console.log(
    `[BetterAuth] ✓ Successfully created ${result.rowCount} account records for email/password users`,
  );

  // Show what we inserted (sample)
  if (result.rowCount > 0) {
    const insertedAccounts = (await connection
      .many(
        sql.unsafe`
      SELECT "id", "userId", "providerId", "accountId", length("password") as pwd_len
      FROM "account"
      WHERE "providerId" = 'email'
      ORDER BY "createdAt" DESC
      LIMIT 5
    `,
      )
      .catch(() => [])) as {
      id: string;
      userId: string;
      providerId: string;
      accountId: string;
      pwd_len: number;
    }[];
    console.log(
      "[BetterAuth] Recently inserted/updated accounts:",
      JSON.stringify(insertedAccounts, undefined, 2),
    );
  }

  // Verify final count
  const finalCount = (await connection
    .maybeOne(
      sql.unsafe`
    SELECT COUNT(*) as count FROM "account" WHERE "providerId" = 'email'
  `,
    )
    .catch(() => ({ count: 0 }))) as { count: number };
  console.log(`[BetterAuth] Total email accounts now: ${finalCount.count}`);
}
