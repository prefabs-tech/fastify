import EmailVerification from "supertokens-node/recipe/emailverification/index.js";

/**
 * Auto verify user email.
 */
const verifyEmail = async (
  userId: string,
  email?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userContext?: any,
) => {
  const tokenResponse = await EmailVerification.createEmailVerificationToken(
    userId,
    email,
    userContext,
  );

  if (tokenResponse.status === "OK") {
    await EmailVerification.verifyEmailUsingToken(
      tokenResponse.token,
      userContext,
    );
  }
};

export default verifyEmail;
