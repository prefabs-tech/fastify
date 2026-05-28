import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export interface AuthAdapter {
  emailPassword: EmailPasswordProvider;
  emailVerification?: EmailVerificationProvider;
  roles: RolesProvider;
  session: SessionProvider;
}

export interface AuthProvider {
  adapter: AuthAdapter;
  init?: (fastify: FastifyInstance) => Promise<void>;
}

export type AuthResult<T = AuthUser> =
  | { error: string; success: false }
  | { success: true; user: T };

export interface AuthSession {
  fetchAndSetClaim?(
    claim: unknown,
    userContext?: AuthUserContext,
  ): Promise<void>;
  getAccessTokenPayload(userContext?: AuthUserContext): unknown;
  getUserId(userContext?: AuthUserContext): string;
  revokeSession(userContext?: AuthUserContext): Promise<void>;
}

// Auth user returned from sign up/sign in
export interface AuthUser {
  [key: string]: unknown;
  email: string;
  id: string;
  timeJoined?: number;
}

export interface AuthUserContext {
  [key: string]: unknown;
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

  unverifyEmail?(userId: string, email?: string): Promise<void>;

  verifyEmailUsingToken(
    token: string,
    userContext?: AuthUserContext,
  ): Promise<boolean>;
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
}

export interface SessionProvider {
  createNewSession(
    request: FastifyRequest,
    reply: FastifyReply,
    userId: string,
    accessTokenPayload?: Record<string, unknown>,
    sessionData?: Record<string, unknown>,
  ): Promise<AuthSession>;

  getSession(
    request: FastifyRequest,
    reply: FastifyReply,
    options?: {
      checkDatabase?: boolean;
      sessionRequired?: boolean;
    },
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
