import type { AuthUser } from "./authProvider";

// ---------------------------------------------------------------------------
// Optional capabilities — a provider only implements what it supports.
// Access via auth.phoneOtp, auth.passkey, auth.oauth.
// Check availability with auth.supports("phoneOtp") before calling.
// ---------------------------------------------------------------------------

export interface PhoneOtpCapability {
  sendOtp(phoneNumber: string): Promise<void>;
  signInWithOtp(phoneNumber: string, otp: string): Promise<AuthUser>;
}

export interface RegistrationOptions {
  challenge: string;
  [key: string]: unknown;
}

export interface AuthenticationOptions {
  challenge: string;
  [key: string]: unknown;
}

export interface PasskeyCapability {
  startRegistration(userId: string): Promise<RegistrationOptions>;
  finishRegistration(
    userId: string,
    response: Record<string, unknown>,
  ): Promise<void>;
  startAuthentication(): Promise<AuthenticationOptions>;
  finishAuthentication(response: Record<string, unknown>): Promise<AuthUser>;
}

export interface OAuthCapability {
  getRedirectUrl(provider: string, redirectUri: string): Promise<string>;
  handleCallback(provider: string, code: string): Promise<AuthUser>;
}
