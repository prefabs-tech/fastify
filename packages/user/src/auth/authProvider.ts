import type { FastifyInstance, FastifyRequest } from "fastify";

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  roles: string[];
  metadata?: Record<string, unknown>;
}

export interface Session {
  sessionId: string;
  userId: string;
  roles: string[];
  expiresAt: Date;
}

export interface AppError {
  code: string;
  message: string;
  statusCode: number;
  cause?: unknown;
}

export type AuthCapability = "phoneOtp" | "passkey" | "oauth";

export interface AuthProvider {
  bootstrap(fastify: FastifyInstance): Promise<void>;

  // --- Email + password (universal) ---
  signUp(
    email: string,
    password: string,
  ): Promise<{ user: AuthUser; token: string }>;
  signIn(
    email: string,
    password: string,
  ): Promise<{ user: AuthUser; token: string }>;
  updateEmail(userId: string, newEmail: string): Promise<void>;
  updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void>;
  sendVerificationEmail(email: string): Promise<void>;
  verifyEmail(token: string): Promise<{ userId: string }>;
  sendPasswordResetEmail(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;

  // --- Session ---
  verifySession(req: FastifyRequest): Promise<Session | undefined>;
  signOut(req: FastifyRequest): Promise<unknown>;
  revokeAllSessions(userId: string): Promise<void>;

  // --- User & roles ---
  getUser(id: string): Promise<AuthUser | undefined>;
  getUserRoles(userId: string): Promise<string[]>;
  assignRoles(userId: string, roles: string[]): Promise<void>;
  removeRoles(userId: string, roles: string[]): Promise<void>;

  // --- Error normalization ---
  normalizeError(err: unknown): AppError;

  // --- Capability registry ---
  supports(capability: AuthCapability): boolean;
  readonly phoneOtp: import("./capabilities").PhoneOtpCapability | undefined;
  readonly passkey: import("./capabilities").PasskeyCapability | undefined;
  readonly oauth: import("./capabilities").OAuthCapability | undefined;
}
