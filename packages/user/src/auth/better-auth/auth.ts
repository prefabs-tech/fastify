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
export function createAuth(config: BetterAuthConfig, connectionString: string) {
  // Create a Kysely instance with a pg Pool that better-auth will use.
  // This satisfies better-auth's expectation for a Kysely adapter.
  const pool = new Pool({ connectionString });
  const db = new Kysely({
    dialect: new PostgresDialect({ pool }),
  });

  return betterAuth({
    database: {
      db: db,
      type: "postgres",
    },

    basePath: config.routePrefix ?? "/auth",

    secret: config.secret,

    trustedOrigins: config.trustedOrigins ?? [],

    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url }) => {
        // POC: log to console. Phase 3: use fastify.mailer
        console.log(
          `[BetterAuth POC] Password reset for ${user.email} → ${url}`,
        );
      },
      sendEmailVerificationOnSignUp: false,
    },

    plugins: [
      // POC assumption #4 — phone OTP capability
      bearer(),
      phoneNumber({
        sendOTP: async ({ phoneNumber: phone, code }) => {
          // POC: log to console. Phase 3: use SMS provider via fastify
          console.log(`[BetterAuth POC] OTP for ${phone}: ${code}`);
        },
        expiresIn: 300,
        signUpOnVerification: {
          getTempEmail: (phone) => `${phone.replaceAll("+", "")}@phone.local`,
          getTempName: (phone) => phone,
        },
      }),

      // Required for revokeAllSessions(userId)
      admin(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
