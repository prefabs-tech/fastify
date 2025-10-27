import { getUserById } from "supertokens-node/recipe/thirdpartyemailpassword";

import sendEmail from "../../../../lib/sendEmail";

import type { FastifyInstance } from "fastify";
import type { RecipeInterface } from "supertokens-node/recipe/thirdpartyemailpassword/types";

const resetPasswordUsingToken = (
  originalImplementation: RecipeInterface,
  fastify: FastifyInstance,
): RecipeInterface["resetPasswordUsingToken"] => {
  return async (input) => {
    const originalResponse =
      await originalImplementation.resetPasswordUsingToken(input);

    if (originalResponse.status === "OK" && originalResponse.userId) {
      const user = await getUserById(originalResponse.userId);

      if (user) {
        sendEmail({
          fastify,
          subject:
            fastify.config.user.emailOverrides?.resetPasswordNotification
              ?.subject || "Reset password notification",
          templateName:
            fastify.config.user.emailOverrides?.resetPasswordNotification
              ?.templateName || "reset-password-notification",
          to: user.email,
          templateData: {
            emailId: user.email,
          },
        });
      }
    }

    return originalResponse;
  };
};

export default resetPasswordUsingToken;
