import { FastifyReply } from "fastify";
import EmailVerification, {
  EmailVerificationClaim,
  isEmailVerified,
} from "supertokens-node/recipe/emailverification";
import { getUsersByEmail } from "supertokens-node/recipe/thirdpartyemailpassword";

import getUserService from "../../../lib/getUserService";
import createUserContext from "../../../supertokens/utils/createUserContext";
import ProfileValidationClaim from "../../../supertokens/utils/profileValidationClaim";
import validateEmail from "../../../validator/email";

import type { ChangeEmailInput } from "../../../types";
import type { SessionRequest } from "supertokens-node/framework/fastify";

const changeEmail = async (request: SessionRequest, reply: FastifyReply) => {
  const { body, config, user, server, slonik, session } = request;

  if (!user) {
    throw server.httpErrors.unauthorized("Unauthorised");
  }

  if (config.user.features?.updateEmail?.enabled === false) {
    throw server.httpErrors.forbidden(
      "Update email feature is currently disabled.",
    );
  }

  try {
    if (config.user.features?.profileValidation?.enabled) {
      await session?.fetchAndSetClaim(
        new ProfileValidationClaim(),
        createUserContext(undefined, request),
      );
    }

    if (config.user.features?.signUp?.emailVerification) {
      await session?.fetchAndSetClaim(
        EmailVerificationClaim,
        createUserContext(undefined, request),
      );
    }

    const email = (body as ChangeEmailInput).email ?? "";

    const emailValidationResult = validateEmail(email, config);

    if (!emailValidationResult.success) {
      throw server.httpErrors.unprocessableEntity(
        emailValidationResult.message || "Invalid email",
      );
    }

    if (user.email === email) {
      return reply.send({
        status: "EMAIL_SAME_AS_CURRENT_ERROR",
        message: "Email is same as the current one.",
      });
    }

    if (config.user.features?.signUp?.emailVerification) {
      const isVerified = await isEmailVerified(user.id, email);

      if (!isVerified) {
        const users = await getUsersByEmail(email);

        const emailPasswordRecipeUsers = users.filter(
          (user) => !user.thirdParty,
        );

        if (emailPasswordRecipeUsers.length > 0) {
          return reply.send({
            status: "EMAIL_ALREADY_EXISTS_ERROR",
          });
        }

        const tokenResponse =
          await EmailVerification.createEmailVerificationToken(user.id, email);

        if (tokenResponse.status === "OK") {
          await EmailVerification.sendEmail({
            type: "EMAIL_VERIFICATION",
            user: {
              id: user.id,
              email: email,
            },
            emailVerifyLink: `${config.appOrigin[0]}/auth/verify-email?token=${tokenResponse.token}&rid=emailverification`,
            userContext: {
              _default: {
                request: {
                  request: request,
                },
              },
            },
          });

          return reply.send({
            status: "OK",
            message: "A verification link has been sent to your email.",
          });
        }

        return reply.send(tokenResponse.status);
      }
    }

    const userService = getUserService(config, slonik);

    const response = await userService.changeEmail(user.id, email);

    request.user = response;

    return reply.send({ status: "OK", message: "Email updated successfully." });
    /*eslint-disable-next-line @typescript-eslint/no-explicit-any */
  } catch (error: any) {
    if (error.message === "EMAIL_ALREADY_EXISTS_ERROR") {
      return reply.send({
        status: error.message,
      });
    }

    throw error;
  }
};

export default changeEmail;
