import emailVerification from "supertokens-node/recipe/emailverification";

import { EMAIL_VERIFICATION_PATH } from "../../../../constants";
import getOrigin from "../../../../lib/getOrigin";
import sendEmail from "../../../../lib/sendEmail";

import type { FastifyInstance, FastifyRequest } from "fastify";
import type { EmailDeliveryInterface } from "supertokens-node/lib/build/ingredients/emaildelivery/types";
import type { TypeEmailVerificationEmailDeliveryInput } from "supertokens-node/recipe/emailverification/types";

const sendEmailVerificationEmail = (
  originalImplementation: EmailDeliveryInterface<TypeEmailVerificationEmailDeliveryInput>,
  fastify: FastifyInstance,
): typeof emailVerification.sendEmail => {
  const websiteDomain = fastify.config.appOrigin[0] as string;

  return async (input) => {
    let origin: string;

    try {
      const request: FastifyRequest =
        input.userContext._default.request.request;

      const url =
        request.headers.referer || request.headers.origin || request.hostname;

      origin = getOrigin(url) || websiteDomain;
    } catch {
      origin = websiteDomain;
    }

    const emailVerifyLink = input.emailVerifyLink.replace(
      websiteDomain + "/auth/verify-email",
      origin +
        (fastify.config.user.supertokens.emailVerificationPath ||
          EMAIL_VERIFICATION_PATH),
    );

    sendEmail({
      fastify,
      subject:
        fastify.config.user.emailOverrides?.emailVerification?.subject ||
        "Email verification",
      templateName:
        fastify.config.user.emailOverrides?.emailVerification?.templateName ||
        "email-verification",
      to: input.user.email,
      templateData: {
        emailVerifyLink,
        user: input.user,
      },
    });
  };
};

export default sendEmailVerificationEmail;
