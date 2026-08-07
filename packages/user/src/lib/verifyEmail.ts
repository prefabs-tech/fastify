import type { AuthUserContext } from "../auth/adapter";

import { auth } from "../auth/adapter";

/**
 * Auto verify user email.
 */
const verifyEmail = async (
  userId: string,
  email?: string,
  userContext?: AuthUserContext,
) => {
  if (!auth.emailVerification) {
    throw new Error(
      "Email verification is not supported by the current auth provider",
    );
  }

  const token = await auth.emailVerification.createEmailVerificationToken(
    userId,
    email,
    userContext,
  );

  await auth.emailVerification.verifyEmailUsingToken(token, userContext);
};

export default verifyEmail;
