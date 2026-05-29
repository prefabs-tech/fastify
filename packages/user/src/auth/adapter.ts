import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import type { ClaimValidationError, RefreshableClaim } from "./types";

export interface AuthAdapter {
  claims: ClaimsProvider;
  createUserContext(
    request: FastifyRequest,
    existing?: AuthUserContext,
  ): AuthUserContext;
  emailPassword: EmailPasswordProvider;
  emailVerification?: EmailVerificationProvider;
  errors: AuthErrorsProvider;
  roles: RolesProvider;
  session: SessionProvider;
}

export interface AuthErrorsProvider {
  createInvalidClaimsError(errors: ClaimValidationError[]): Error;

  createUnauthorizedError(message?: string): Error;

  isAuthError(error: unknown): boolean;
}

export interface AuthProvider {
  adapter: AuthAdapter;
  init?: (fastify: FastifyInstance) => Promise<void>;
}

export type AuthResult<T = AuthUser> =
  | { error: string; success: false }
  | { success: true; user: T };

export interface AuthSession {
  assertClaims?(
    validators: unknown[],
    userContext?: AuthUserContext,
  ): Promise<void>;
  fetchAndSetClaim?(
    claim: unknown,
    userContext?: AuthUserContext,
  ): Promise<void>;
  getAccessTokenPayload(userContext?: AuthUserContext): unknown;
  getUserId(userContext?: AuthUserContext): string;
  revokeSession(userContext?: AuthUserContext): Promise<void>;
}

export interface AuthUser {
  [key: string]: unknown;
  email: string;
  id: string;
  timeJoined?: number;
}

export interface AuthUserContext {
  [key: string]: unknown;
}

export interface ClaimsProvider {
  assertProfileValid(
    session: AuthSession,
    request: FastifyRequest,
    userContext?: AuthUserContext,
  ): Promise<ClaimValidationError[] | undefined>;

  excludeValidatorIds<T extends { id: string }>(
    validators: T[],
    skip: RefreshableClaim[],
  ): T[];

  readonly keys: {
    emailVerification: string;
    profileValidation: string;
  };

  refreshSessionClaims(
    session: AuthSession,
    request: FastifyRequest,
    claims: RefreshableClaim[],
    userContext?: AuthUserContext,
  ): Promise<void>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  verifySessionOptions(skip: RefreshableClaim[]): any;
}

export interface EmailPasswordProvider {
  createResetPasswordToken?(userId: string): Promise<string>;

  emailPasswordSignIn(
    email: string,
    password: string,
    userContext?: AuthUserContext,
  ): Promise<AuthResult>;

  emailPasswordSignUp(
    email: string,
    password: string,
    userContext?: AuthUserContext,
  ): Promise<AuthResult>;

  getUserById(userId: string): Promise<AuthUser | undefined>;

  getUsersByEmail?(email: string): Promise<AuthUser[]>;

  resetPasswordUsingToken?(
    token: string,
    newPassword: string,
  ): Promise<ResetPasswordResult>;

  updateEmailOrPassword(input: {
    email?: string;
    password?: string;
    userId: string;
  }): Promise<UpdateEmailOrPasswordResult>;
}

export interface EmailVerificationProvider {
  createEmailVerificationToken(
    userId: string,
    email?: string,
    userContext?: AuthUserContext,
  ): Promise<string>;

  isEmailVerified(userId: string, email?: string): Promise<boolean>;

  sendVerificationEmail?(input: {
    appOrigin: string;
    email: string;
    token: string;
    userContext?: AuthUserContext;
    userId: string;
  }): Promise<{ status: string; success: boolean }>;

  unverifyEmail?(userId: string, email?: string): Promise<void>;

  verifyEmailUsingToken(
    token: string,
    userContext?: AuthUserContext,
  ): Promise<boolean>;
}

export interface GetSessionOptions {
  checkDatabase?: boolean;
  sessionRequired?: boolean;
  skipClaims?: RefreshableClaim[];
}

export type ResetPasswordResult =
  | { error: "INVALID_TOKEN" | "TOKEN_EXPIRED" | string; success: false }
  | { success: true };

export interface RolesProvider {
  addRoleToUser?(userId: string, role: string): Promise<void>;

  createNewRoleOrAddPermissions(
    role: string,
    permissions: string[],
  ): Promise<boolean>;

  deleteRole(role: string): Promise<boolean>;

  getAllRoles(): Promise<string[]>;

  getPermissionsForRole(role: string): Promise<string[]>;

  getRolesForUser(userId: string): Promise<string[]>;

  getUsersThatHaveRole(role: string): Promise<string[]>;

  PermissionClaim?: {
    key: string;
  };

  removePermissionsFromRole(role: string, permissions: string[]): Promise<void>;

  rolesExist(roles: string[]): Promise<boolean>;
}

export interface SessionProvider {
  createNewSession(
    request: FastifyRequest,
    reply: FastifyReply,
    userId: string,
    accessTokenPayload?: Record<string, unknown>,
    sessionData?: Record<string, unknown>,
    userContext?: AuthUserContext,
  ): Promise<AuthSession>;

  getSession(
    request: FastifyRequest,
    reply: FastifyReply,
    options?: GetSessionOptions,
  ): Promise<AuthSession | undefined>;

  revokeAllSessionsForUser(
    userId: string,
    userContext?: AuthUserContext,
  ): Promise<void>;
}

export interface UpdateEmailOrPasswordResult {
  error?: string;
  success: boolean;
}

export type { ClaimValidationError, RefreshableClaim } from "./types";

declare module "fastify" {
  interface FastifyRequest {
    session?: AuthSession;
  }
}

let authInstance: AuthAdapter | undefined;

export function getAuth(): AuthAdapter {
  if (!authInstance) {
    throw new Error("Auth adapter not initialized. Call initAuth() first.");
  }
  return authInstance;
}

export async function initAuth(
  fastify: FastifyInstance,
  provider: AuthProvider,
): Promise<AuthAdapter> {
  if (!authInstance) {
    authInstance = provider.adapter;

    if (provider.init) {
      await provider.init(fastify);
    }
  }
  return authInstance;
}

export const auth = new Proxy({} as AuthAdapter, {
  get(_target, property) {
    return getAuth()[property as keyof AuthAdapter];
  },
});
