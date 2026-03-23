import FastifyPlugin from "fastify-plugin";

import type { BetterAuthProvider } from "./betterAuthProvider";
import type { FastifyInstance } from "fastify";

/**
 * POC test routes — registered only when authProvider === "better-auth".
 *
 * Each route maps directly to one RFC assumption.
 * Base URL: /poc/auth/*
 *
 * These routes are intentionally simple — no validation middleware, no
 * GraphQL integration. They exist solely to verify RFC assumptions against
 * the real better-auth SDK in the monorepo environment.
 *
 * Remove or gate behind a feature flag before going to production.
 */
const pocRoutes = async (
  fastify: FastifyInstance,
  options: { auth: BetterAuthProvider },
) => {
  const { auth } = options;

  // -------------------------------------------------------------------------
  // RFC assumption #1+2: sign-up, assign default role, return AuthUser
  // POST /poc/auth/signup  { email, password }
  // -------------------------------------------------------------------------

  fastify.post<{ Body: { email: string; password: string } }>(
    "/poc/auth/signup",
    async (req, reply) => {
      try {
        const user = await auth.signUp(req.body.email, req.body.password);
        await auth.assignRoles(user.id, ["ROLE_USER"]);
        user.roles = await auth.getUserRoles(user.id);
        return reply.code(201).send({ ok: true, user });
      } catch (error) {
        const appError = auth.normalizeError(error);
        return reply.code(appError.statusCode).send({ error: appError });
      }
    },
  );

  // -------------------------------------------------------------------------
  // RFC assumption #2: sign-in → returns user + token
  // POST /poc/auth/signin  { email, password }
  // -------------------------------------------------------------------------

  fastify.post<{ Body: { email: string; password: string } }>(
    "/poc/auth/signin",
    async (req, reply) => {
      try {
        const result = await auth.signIn(req.body.email, req.body.password);
        return reply.send({ ok: true, user: result.user, token: result.token });
      } catch (error) {
        const appError = auth.normalizeError(error);
        return reply.code(appError.statusCode).send({ error: appError });
      }
    },
  );

  // -------------------------------------------------------------------------
  // RFC assumption #3: session verification → Session shape
  // GET /poc/auth/me  (Authorization: Bearer <token>)
  // -------------------------------------------------------------------------

  fastify.get("/poc/auth/me", async (req, reply) => {
    const session = await auth.verifySession(req);
    if (!session) {
      return reply.code(401).send({
        error: { code: "AUTH_SESSION_EXPIRED", message: "No valid session" },
      });
    }
    const user = await auth.getUser(session.userId);
    return reply.send({ ok: true, session, user });
  });

  // -------------------------------------------------------------------------
  // RFC assumption #3: sign-out
  // POST /poc/auth/signout  { token }
  // -------------------------------------------------------------------------

  fastify.post<{ Body: { token: string } }>(
    "/poc/auth/signout",
    async (req, reply) => {
      await auth.signOut(req.body.token);
      return reply.send({ ok: true });
    },
  );

  // -------------------------------------------------------------------------
  // RFC assumption #6: role management via user_roles table
  // POST /poc/auth/roles/assign  { userId, roles }
  // POST /poc/auth/roles/remove  { userId, roles }
  // GET  /poc/auth/roles/:userId
  // -------------------------------------------------------------------------

  fastify.post<{ Body: { userId: string; roles: string[] } }>(
    "/poc/auth/roles/assign",
    async (req, reply) => {
      await auth.assignRoles(req.body.userId, req.body.roles);
      return reply.send({
        ok: true,
        roles: await auth.getUserRoles(req.body.userId),
      });
    },
  );

  fastify.post<{ Body: { userId: string; roles: string[] } }>(
    "/poc/auth/roles/remove",
    async (req, reply) => {
      await auth.removeRoles(req.body.userId, req.body.roles);
      return reply.send({
        ok: true,
        roles: await auth.getUserRoles(req.body.userId),
      });
    },
  );

  fastify.get<{ Params: { userId: string } }>(
    "/poc/auth/roles/:userId",
    async (req, reply) => {
      return reply.send({
        ok: true,
        roles: await auth.getUserRoles(req.params.userId),
      });
    },
  );

  // -------------------------------------------------------------------------
  // RFC assumption #4: phone OTP capability
  // POST /poc/auth/otp/send    { phoneNumber }
  // POST /poc/auth/otp/verify  { phoneNumber, otp }
  // -------------------------------------------------------------------------

  fastify.post<{ Body: { phoneNumber: string } }>(
    "/poc/auth/otp/send",
    async (req, reply) => {
      if (!auth.supports("phoneOtp")) {
        return reply.code(501).send({
          error: "phoneOtp capability not supported by this provider",
        });
      }
      try {
        await auth.phoneOtp!.sendOtp(req.body.phoneNumber);
        return reply.send({
          ok: true,
          note: "OTP logged to server console (POC)",
        });
      } catch (error) {
        return reply
          .code(auth.normalizeError(error).statusCode)
          .send({ error: auth.normalizeError(error) });
      }
    },
  );

  fastify.post<{ Body: { phoneNumber: string; otp: string } }>(
    "/poc/auth/otp/verify",
    async (req, reply) => {
      if (!auth.supports("phoneOtp")) {
        return reply.code(501).send({
          error: "phoneOtp capability not supported by this provider",
        });
      }
      try {
        const user = await auth.phoneOtp!.signInWithOtp(
          req.body.phoneNumber,
          req.body.otp,
        );
        return reply.send({ ok: true, user });
      } catch (error) {
        return reply
          .code(auth.normalizeError(error).statusCode)
          .send({ error: auth.normalizeError(error) });
      }
    },
  );

  // -------------------------------------------------------------------------
  // RFC assumption #5: passkey capability check
  // GET /poc/auth/passkey/status
  // -------------------------------------------------------------------------

  fastify.get("/poc/auth/passkey/status", async (_req, reply) => {
    return reply.send({
      supported: auth.supports("passkey"),
      note: auth.supports("passkey")
        ? "Passkey capability is available"
        : "Passkey not supported in better-auth v1.x — see poc/better-auth/findings.md",
    });
  });

  // -------------------------------------------------------------------------
  // RFC assumption #7: error normalization — assert correct AppError codes
  // POST /poc/auth/error-test/bad-credentials  { email }
  // POST /poc/auth/error-test/duplicate-signup { email, password }
  // -------------------------------------------------------------------------

  fastify.post<{ Body: { email: string } }>(
    "/poc/auth/error-test/bad-credentials",
    async (req, reply) => {
      try {
        await auth.signIn(req.body.email, "definitely-wrong-password-poc");
        return reply.send({
          ok: true,
          note: "unexpected success — assertion failed",
        });
      } catch (error) {
        const appError = auth.normalizeError(error);
        return reply.code(appError.statusCode).send({
          appError,
          assertions: {
            codeIsCorrect: appError.code === "AUTH_INVALID_CREDENTIALS",
            statusCodeIsCorrect: appError.statusCode === 401,
          },
        });
      }
    },
  );

  fastify.post<{ Body: { email: string; password: string } }>(
    "/poc/auth/error-test/duplicate-signup",
    async (req, reply) => {
      try {
        await auth.signUp(req.body.email, req.body.password);
        await auth.signUp(req.body.email, req.body.password);
        return reply.send({
          ok: true,
          note: "unexpected success — assertion failed",
        });
      } catch (error) {
        const appError = auth.normalizeError(error);
        return reply.code(appError.statusCode).send({
          appError,
          assertions: {
            codeIsCorrect: appError.code === "AUTH_EMAIL_EXISTS",
            statusCodeIsCorrect: appError.statusCode === 409,
          },
        });
      }
    },
  );

  // -------------------------------------------------------------------------
  // Capability summary
  // GET /poc/auth/capabilities
  // -------------------------------------------------------------------------

  fastify.get("/poc/auth/capabilities", async (_req, reply) => {
    return reply.send({
      emailPassword: true,
      phoneOtp: auth.supports("phoneOtp"),
      passkey: auth.supports("passkey"),
      oauth: auth.supports("oauth"),
    });
  });
};

export default FastifyPlugin(pocRoutes, { name: "poc-better-auth-routes" });
