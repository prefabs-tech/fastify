import type { FastifyInstance } from "fastify";
import type { RecipeInterface } from "supertokens-node/recipe/thirdpartyemailpassword/types";

import sendEmail from "../../../../lib/sendEmail";

const consumePasswordResetToken = (
  originalImplementation: RecipeInterface,
  fastify: FastifyInstance,
): RecipeInterface["consumePasswordResetToken"] => {
  return async (input) => {
    const originalResponse =
      await originalImplementation.consumePasswordResetToken(input);

    if (originalResponse.status === "OK") {
      sendEmail({
        fastify,
        subject:
          fastify.config.user.emailOverrides?.resetPasswordNotification
            ?.subject || "Reset password notification",
        templateData: {
          emailId: originalResponse.email,
        },
        templateName:
          fastify.config.user.emailOverrides?.resetPasswordNotification
            ?.templateName || "reset-password-notification",
        to: originalResponse.email,
      });
    }

    return originalResponse;
  };
};

export default consumePasswordResetToken;
