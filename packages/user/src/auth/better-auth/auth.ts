import bcrypt from "bcryptjs";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";
import { bearer } from "better-auth/plugins/bearer";
import { phoneNumber } from "better-auth/plugins/phone-number";
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

import type { BetterAuthConfig } from "../../types/config";

/**
 * Creates the Better Auth instance from config.
 *
 * connectionString is derived from fastify.config.slonik.db via stringifyDsn
 * in plugin.ts — the same DB that slonik already connects to. No separate
 * DB configuration needed.
 *
 * Our application queries (getUser, roles) go through slonik (fastify.slonik).
 * better-auth manages its own tables internally (user, session, account, verification).
 *
 * POC notes:
 *  - sendOTP logs to console — replace with fastify.mailer in Phase 3
 *  - sendResetPassword logs to console — same
 *  - admin plugin required for revokeUserSessions(userId)
 *  - passkey not in better-auth v1.x — tracked in findings.md
 */
// Custom password hashing using bcrypt to support SuperTokens legacy passwords
async function bcryptHash(password: string): Promise<string> {
  return bcrypt.hashSync(password, 10); // 10 rounds - synchronous for simplicity
}

async function bcryptVerify({
  password,
  hash,
}: {
  password: string;
  hash: string;
}): Promise<boolean> {
  try {
    return bcrypt.compareSync(password, hash);
  } catch {
    // If comparison fails due to invalid hash format, return false
    return false;
  }
}

export function createAuth(config: BetterAuthConfig, connectionString: string) {
  // Create a Kysely instance with a pg Pool that better-auth will use.
  // This satisfies better-auth's expectation for a Kysely adapter.
  const pool = new Pool({ connectionString });
  const db = new Kysely({
    dialect: new PostgresDialect({ pool }),
  });

  // Determine the users table name from config, default to "users"
  // Note: TABLE_USERS constant is "users" but config can override
  // However, config.tables?.users?.name is not directly accessible here
  // because BetterAuthConfig doesn't expose it. We'd need to pass it through.
  // For now, we'll keep it simple and assume "users".
  const usersTableName = "users"; // Could be made configurable in a future iteration

  return betterAuth({
    database: {
      db: db,
      type: "postgres",
      // Use default casing (preserve field names as defined in schema)
      // The account table uses camelCase column names: accountId, providerId, userId, createdAt, updatedAt
    },

    basePath: config.routePrefix ?? "/auth",

    secret: config.secret,

    trustedOrigins: config.trustedOrigins ?? [],

    // Configure BetterAuth to use our existing 'users' table
    user: {
      // Use our existing table name instead of default "user"
      modelName: usersTableName,
      // Disable automatic table creation - we manage the table ourselves
      disableMigrations: true,
    },

    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url }) => {
        // POC: log to console. Phase 3: use fastify.mailer
        console.log(
          `[BetterAuth POC] Password reset for ${user.email} → ${url}`,
        );
      },
      sendEmailVerificationOnSignUp: false,
      // Use bcrypt for password hashing and verification to support SuperTokens legacy passwords
      password: {
        hash: bcryptHash,
        verify: bcryptVerify,
      },
    },

    plugins: [
      bearer(),
      phoneNumber({
        sendOTP: async ({ phoneNumber: phone, code }) => {
          console.log(`[BetterAuth POC] OTP for ${phone}: ${code}`);
        },
        expiresIn: 300,
        signUpOnVerification: {
          getTempEmail: (phone) => `${phone.replaceAll("+", "")}@phone.local`,
          getTempName: (phone) => phone,
        },
      }),
      admin(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
