/* eslint-disable n/no-unsupported-features/node-builtins -- better-auth requires the Fetch API (Headers); supported in Node >=18 */
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { sql, stringifyDsn } from "slonik";

import { createAuth } from "./auth";

import type { BetterAuthConfig } from "../../types/config";
import type { User } from "../../types/user";
import type {
  AppError,
  AuthCapability,
  AuthProvider,
  AuthUser,
  Session,
} from "../authProvider";
import type {
  OAuthCapability,
  PasskeyCapability,
  PhoneOtpCapability,
} from "../capabilities";
import type { SlonikOptions } from "@prefabs.tech/fastify-slonik";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { ConnectionRoutine, DatabasePool, QueryFunction } from "slonik";

// fastify.slonik shape — mirrors the declaration in @prefabs.tech/fastify-slonik
// so we don't need a side-effect import of that plugin here.
type SlonikDatabase = {
  connect: <T>(connectionRoutine: ConnectionRoutine<T>) => Promise<T>;
  pool: DatabasePool;
  query: QueryFunction;
};

// Extend Node's IncomingMessage to include an optional body property
// This is needed because better-auth's better-call expects to read req.raw.body
declare module "http" {
  interface IncomingMessage {
    body?: unknown;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    slonik: SlonikDatabase;
  }
}

declare module "@prefabs.tech/fastify-config" {
  interface ApiConfig {
    cors?: {
      origin?: string | string[];
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toAuthUser(
  user: { id: string; email: string; emailVerified: boolean },
  roles: string[] = [],
): AuthUser {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    roles,
  };
}

// ---------------------------------------------------------------------------
// Phone OTP capability
// ---------------------------------------------------------------------------

class BetterAuthPhoneOtp implements PhoneOtpCapability {
  constructor(private readonly auth: ReturnType<typeof createAuth>) {}

  async sendOtp(phoneNumber: string): Promise<void> {
    await this.auth.api.sendPhoneNumberOTP({
      body: { phoneNumber },
      headers: new Headers(),
    });
  }

  async signInWithOtp(phoneNumber: string, code: string): Promise<AuthUser> {
    const result = await this.auth.api.verifyPhoneNumber({
      body: { phoneNumber, code },
      headers: new Headers(),
    });
    return toAuthUser(result!.user);
  }
}

// ---------------------------------------------------------------------------
// BetterAuthProvider
// ---------------------------------------------------------------------------

export class BetterAuthProvider implements AuthProvider {
  private readonly auth: ReturnType<typeof createAuth>;
  private db!: SlonikDatabase;
  private readonly routePrefix: string;
  readonly phoneOtp: PhoneOtpCapability;
  readonly passkey: PasskeyCapability | undefined = undefined;
  readonly oauth: OAuthCapability | undefined = undefined;

  // verifySessionHandler is the actual preHandler that will be used.
  private verifySessionHandler = async (
    req: FastifyRequest,
    reply: FastifyReply,
  ) => {
    const session = await this.verifySession(req);
    if (!session) {
      reply.code(401);
      throw { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" };
    }
    const authUser = await this.getUser(session.userId);
    if (!authUser) {
      reply.code(401);
      throw { code: "AUTH_USER_NOT_FOUND", message: "User not found" };
    }
    const user: User = {
      id: authUser.id,
      email: authUser.email,
      disabled: false,
      lastLoginAt: 0,
      signedUpAt: 0,
      roles: authUser.roles,
    };
    req.user = user;
  };

  constructor(config: BetterAuthConfig, dbConfig: SlonikOptions) {
    const connectionString = stringifyDsn(dbConfig.db);
    // Normalize route prefix: remove trailing slashes, default to /auth
    this.routePrefix = (config.routePrefix ?? "/auth").replace(/\/+$/, "");
    this.auth = createAuth(config, connectionString);
    this.phoneOtp = new BetterAuthPhoneOtp(this.auth);
  }

  supports(capability: AuthCapability): boolean {
    return this[capability] !== undefined;
  }

  async bootstrap(fastify: FastifyInstance): Promise<void> {
    this.db = fastify.slonik;

    // Decorate fastify with verifySession factory. The factory returns the preHandler.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fastify as any).decorate("verifySession", () => this.verifySessionHandler);

    const fullRoutePattern = this.routePrefix + "/*";
    fastify.log.info(
      `[BetterAuthProvider] Registering auth routes: pattern=${fullRoutePattern}, prefix=${this.routePrefix}`,
    );

    // Register auth routes for all methods EXCEPT OPTIONS (handled by CORS plugin)
    fastify.route({
      method: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"],
      url: fullRoutePattern,
      handler: async (req, reply) => {
        // DEBUG: log that handler is invoked
        fastify.log.info(
          {
            method: req.method,
            url: req.url,
            rawUrl: req.raw.url,
            routeConfig: req.routeOptions?.config,
          },
          "[BetterAuthProvider] Request hit catch-all handler",
        );

        // Because better-call writes directly to reply.raw (Node's ServerResponse),
        // we must copy CORS headers from Fastify's reply to raw before invoking better-call.
        // The CORS plugin (preHandler) has already added these to reply.
        const corsHeaders = [
          "access-control-allow-origin",
          "access-control-allow-credentials",
          "access-control-expose-headers",
          "vary",
        ];
        for (const header of corsHeaders) {
          const value = reply.getHeader(header);
          if (value !== undefined) {
            reply.raw.setHeader(header, value);
          }
        }

        // better-call expects to read the body from req.raw.body if the stream is already consumed.
        // Fastify parses the body and sets req.body, but req.raw.body remains undefined.
        // Copy the parsed body to req.raw so better-call can use it.
        if (req.body !== undefined) {
          req.raw.body = req.body;
        }
        const handler = toNodeHandler(this.auth);
        await handler(req.raw, reply.raw);
        return reply;
      },
    });

    fastify.log.info(
      `[BetterAuthProvider] bootstrapped — auth routes at ${this.routePrefix}/*`,
    );
  }

  async signUp(email: string, password: string): Promise<AuthUser> {
    const result = await this.auth.api.signUpEmail({
      body: { email, password, name: email },
    });
    const roles = await this.getUserRoles(result.user.id);

    return toAuthUser(result.user, roles);
  }

  async signIn(
    email: string,
    password: string,
  ): Promise<{ user: AuthUser; token: string }> {
    const result = await this.auth.api.signInEmail({
      body: { email, password },
    });
    const roles = await this.getUserRoles(result.user.id);

    return {
      user: toAuthUser(result.user, roles),
      token: result.token ?? "",
    };
  }

  async updateEmail(_userId: string, newEmail: string): Promise<void> {
    await this.auth.api.changeEmail({
      body: { newEmail },
      headers: new Headers(),
    });
  }

  async updatePassword(
    _userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    await this.auth.api.changePassword({
      body: { currentPassword, newPassword, revokeOtherSessions: true },
      headers: new Headers(),
    });
  }

  async sendVerificationEmail(email: string): Promise<void> {
    await this.auth.api.sendVerificationEmail({
      body: { email },
      headers: new Headers(),
    });
  }

  async verifyEmail(token: string): Promise<{ userId: string }> {
    await this.auth.api.verifyEmail({
      query: { token },
      headers: new Headers(),
    });
    return { userId: "decoded-from-token" };
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    await this.auth.api.forgetPassword({
      body: { email, redirectTo: "/reset-password" },
      headers: new Headers(),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.auth.api.resetPassword({
      body: { token, newPassword },
      headers: new Headers(),
    });
  }

  async verifySession(req: FastifyRequest): Promise<Session | undefined> {
    const session = await this.auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) return undefined;

    const roles = await this.getUserRoles(session.user.id);

    return {
      sessionId: session.session.id,
      userId: session.user.id,
      roles,
      expiresAt: new Date(session.session.expiresAt),
    };
  }

  async signOut(authorizationHeader: string): Promise<void> {
    await this.auth.api.signOut({
      headers: new Headers({
        authorization: authorizationHeader,
      }),
    });
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.auth.api.revokeUserSessions({
      body: { userId },
      headers: new Headers(),
    });
  }

  async getUser(id: string): Promise<AuthUser | undefined> {
    return this.db.connect(async (connection) => {
      const row = await connection.maybeOne(sql.unsafe`
        SELECT id, email, ${sql.identifier(["emailVerified"])}
        FROM "user"
        WHERE id = ${id}
      `);

      if (!row) return;

      const roles = await this.getUserRoles(id);

      return {
        id: row.id as string,
        email: row.email as string,
        emailVerified: row.emailVerified as boolean,
        roles,
      };
    });
  }

  async getUserRoles(userId: string): Promise<string[]> {
    return this.db.connect(async (connection) => {
      const rows = await connection
        .many(sql.unsafe`SELECT role FROM user_roles WHERE user_id = ${userId}`)
        .catch(() => []);
      return rows.map((r) => r.role as string);
    });
  }

  async assignRoles(userId: string, roles: string[]): Promise<void> {
    await this.db.connect(async (connection) => {
      await connection.transaction(async (tx) => {
        for (const role of roles) {
          await tx.query(sql.unsafe`
            INSERT INTO user_roles (user_id, role)
            VALUES (${userId}, ${role})
            ON CONFLICT (user_id, role) DO NOTHING
          `);
        }
      });
    });
  }

  async removeRoles(userId: string, roles: string[]): Promise<void> {
    await this.db.connect(async (connection) => {
      await connection.transaction(async (tx) => {
        for (const role of roles) {
          await tx.query(sql.unsafe`
            DELETE FROM user_roles WHERE user_id = ${userId} AND role = ${role}
          `);
        }
      });
    });
  }

  normalizeError(err: unknown): AppError {
    if (err !== null && typeof err === "object" && "status" in err) {
      const apiError = err as {
        status: number;
        body?: { code?: string; message?: string };
      };
      const code = apiError.body?.code ?? "";

      const codeMap: Record<string, { code: string; statusCode: number }> = {
        INVALID_EMAIL_OR_PASSWORD: {
          code: "AUTH_INVALID_CREDENTIALS",
          statusCode: 401,
        },
        USER_ALREADY_EXISTS: { code: "AUTH_EMAIL_EXISTS", statusCode: 409 },
        USER_NOT_FOUND: { code: "AUTH_USER_NOT_FOUND", statusCode: 404 },
        SESSION_EXPIRED: { code: "AUTH_SESSION_EXPIRED", statusCode: 401 },
        EMAIL_NOT_VERIFIED: {
          code: "AUTH_EMAIL_NOT_VERIFIED",
          statusCode: 403,
        },
        INVALID_TOKEN: { code: "AUTH_INVALID_TOKEN", statusCode: 401 },
        OTP_EXPIRED: { code: "AUTH_OTP_EXPIRED", statusCode: 401 },
        INVALID_OTP: { code: "AUTH_INVALID_CREDENTIALS", statusCode: 401 },
      };

      const mapped = codeMap[code];

      if (mapped) {
        return {
          ...mapped,
          message: apiError.body?.message ?? mapped.code,
          cause: err,
        };
      }

      return {
        code: "AUTH_ERROR",
        message: apiError.body?.message ?? "Authentication error",
        statusCode: apiError.status ?? 500,
        cause: err,
      };
    }

    return {
      code: "AUTH_UNKNOWN_ERROR",
      message: "An unexpected error occurred",
      statusCode: 500,
      cause: err,
    };
  }
}
