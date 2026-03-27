import bcrypt from "bcryptjs";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";
import { bearer } from "better-auth/plugins/bearer";
import { phoneNumber } from "better-auth/plugins/phone-number";
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

import type { BetterAuthConfig } from "../../types/config";

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

    user: {
      // Use our existing table name instead of default "user"
      modelName: "users",
      // Disable automatic table creation - we manage the table ourselves
      disableMigrations: true,
      fields: {
        createdAt: "signed_up_at",
        deletedAt: "deleted_at",
        emailVerified: "email_verified",
        emailVerifiedAt: "email_verified_at",
        updatedAt: "updated_at",
        name: "given_name",
        phoneNumber: "phone_number",
        phoneNumberVerified: "phone_number_verified",
        lastLoginAt: "last_login_at",
      },
      additionalFields: {
        disabled: { type: "boolean", fieldName: "disabled", required: false },
        middleNames: {
          type: "string",
          fieldName: "middle_names",
          required: false,
        },
        photoId: { type: "number", fieldName: "photo_id", required: false },
        surname: { type: "string", fieldName: "surname", required: false },
      },
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
      password: {
        hash: bcryptHash,
        verify: bcryptVerify,
      },
    },

    plugins: [
      // POC assumption #4 — phone OTP capability
      bearer(),
      phoneNumber({
        schema: {
          user: {
            fields: {
              phoneNumber: "phone_number",
              phoneNumberVerified: "phone_number_verified",
            },
          },
        },
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
      admin({
        schema: {
          user: {
            fields: {
              role: "role",
              banned: "banned",
              banReason: "ban_reason",
              banExpires: "ban_expires",
            },
          },
        },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
