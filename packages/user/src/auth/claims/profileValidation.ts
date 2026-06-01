import type { UserUpdateInput } from "../../types";

export interface ProfileValidationConfig {
  enabled?: boolean;
  fields?: Array<keyof UserUpdateInput>;
  gracePeriodInDays?: number;
}

export interface ProfileValidationResult {
  gracePeriodEndsAt?: number;
  isVerified: boolean;
}

export function checkProfileValidation<T extends { signedUpAt: number }>(
  user: T,
  config: ProfileValidationConfig,
): ProfileValidationResult {
  const fields = config.fields ?? [];

  const isVerified = !fields.some(
    (field) =>
      (user as Record<string, unknown>)[field as string] === null ||
      (user as Record<string, unknown>)[field as string] === undefined,
  );

  const gracePeriodEndsAt =
    !isVerified && config.gracePeriodInDays
      ? user.signedUpAt + config.gracePeriodInDays * 24 * 60 * 60 * 1000
      : undefined;

  return { gracePeriodEndsAt, isVerified };
}
