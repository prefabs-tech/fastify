import type { AppConfig } from "@prefabs.tech/fastify-config";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { EmailDeliveryInterface } from "supertokens-node/lib/build/ingredients/emaildelivery/types.js";
import type { TypeEmailVerificationEmailDeliveryInput } from "supertokens-node/recipe/emailverification/types/index.js";

import emailVerification from "supertokens-node/recipe/emailverification/index.js";

import { EMAIL_VERIFICATION_PATH } from "../../../../constants.js";
import getAppLinkPath from "../../../../lib/getAppLinkPath.js";
import getOrigin from "../../../../lib/getOrigin.js";
import sendEmail from "../../../../lib/sendEmail.js";

const sendEmailVerificationEmail = (
  originalImplementation: EmailDeliveryInterface<TypeEmailVerificationEmailDeliveryInput>,
  fastify: FastifyInstance,
): typeof emailVerification.sendEmail => {
  const websiteDomain = fastify.config.appOrigin[0] as string;

  return async (input) => {
    let app: AppConfig | undefined;
    let origin: string;

    try {
      const request: FastifyRequest<{
        Querystring: { appId: string | undefined };
      }> = input.userContext._default.request.request;

      if (request.query?.appId) {
        const appId = Number(request.query.appId);

        app = fastify.config.apps?.find((app) => app.id === appId);
      }

      const url =
        app?.origin ||
        request.headers.referer ||
        request.headers.origin ||
        request.hostname;

      origin = getOrigin(url) || websiteDomain;
    } catch {
      origin = websiteDomain;
    }

    const emailVerifyLink = input.emailVerifyLink.replace(
      websiteDomain + "/auth/verify-email",
      origin +
        (getAppLinkPath(app, "emailVerification") ||
          fastify.config.user.supertokens.emailVerificationPath ||
          EMAIL_VERIFICATION_PATH),
    );

    sendEmail({
      fastify,
      subject:
        fastify.config.user.emailOverrides?.emailVerification?.subject ||
        "Email verification",
      templateData: {
        emailVerifyLink,
        user: input.user,
      },
      templateName:
        fastify.config.user.emailOverrides?.emailVerification?.templateName ||
        "email-verification",
      to: input.user.email,
    });
  };
};

export default sendEmailVerificationEmail;
