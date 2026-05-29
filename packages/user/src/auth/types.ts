export interface ClaimValidationError {
  id: string;
  reason: unknown;
}

/** Session claims that can be refreshed or excluded from route verification. */
export type RefreshableClaim = "emailVerification" | "profileValidation";
