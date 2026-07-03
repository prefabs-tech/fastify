import Stripe from "stripe";

export const stripeErrorHttpStatusMap: Record<string, number> = {
  StripeAPIError: 500,
  StripeAuthenticationError: 401,
  StripeCardError: 402,
  StripeConnectionError: 502,
  StripeError: 500,
  StripeIdempotencyError: 409,
  StripeInvalidGrantError: 400,
  StripeInvalidRequestError: 400,
  StripePermissionError: 403,
  StripeRateLimitError: 429,
  StripeSignatureVerificationError: 400,
  TemporarySessionExpiredError: 400,
};

export const stripeErrorToHttpStatus = (type: string): number =>
  stripeErrorHttpStatusMap[type] ?? 500;

export const isStripeError = (
  error: unknown,
): error is Stripe.errors.StripeError => {
  return error instanceof Stripe.errors.StripeError;
};

export const getStripeErrorHttpStatus = (
  error: Stripe.errors.StripeError,
): number => {
  if (error.statusCode !== undefined) {
    return error.statusCode;
  }

  return stripeErrorToHttpStatus(error.type);
};
