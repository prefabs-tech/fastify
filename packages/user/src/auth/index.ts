export { auth, getAuth, getRequiredSession, initAuth } from "./adapter";
export type {
  AuthAdapter,
  AuthErrorsProvider,
  AuthProvider,
  AuthSession,
  AuthUser,
  AuthUserContext,
  ClaimsProvider,
  ClaimValidationError,
  EmailPasswordProvider,
  EmailVerificationProvider,
  GetSessionOptions,
  RefreshableClaim,
  RolesProvider,
  SessionProvider,
} from "./adapter";
export { checkProfileValidation } from "./claims/profileValidation";

export type {
  ProfileValidationConfig,
  ProfileValidationResult,
} from "./claims/profileValidation";
export {
  getAuthProvider,
  registerAuthProvider,
  supertokensProvider,
} from "./providers";
