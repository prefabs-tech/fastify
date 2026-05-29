import type { FastifyReply, FastifyRequest } from "fastify";

import type { AuthSession } from "../../../auth/adapter";
import type { ChangeEmailInput } from "../../../types";

import { auth } from "../../../auth/adapter";
import getUserService from "../../../lib/getUserService";
import validateEmail from "../../../validator/email";

const changeEmail = async (request: FastifyRequest, reply: FastifyReply) => {
  const { body, config, server, slonik, user } = request;
  const session = (request as FastifyRequest & { session: AuthSession })
    .session;

  if (!user) {
    throw server.httpErrors.unauthorized("Unauthorised");
  }

  if (config.user.features?.updateEmail?.enabled === false) {
    throw server.httpErrors.forbidden(
      "Update email feature is currently disabled.",
    );
  }

  try {
    const userContext = auth.createUserContext(request);

    if (config.user.features?.profileValidation?.enabled) {
      await auth.claims.refreshSessionClaims(
        session,
        request,
        ["profileValidation"],
        userContext,
      );
    }

    if (config.user.features?.signUp?.emailVerification) {
      await auth.claims.refreshSessionClaims(
        session,
        request,
        ["emailVerification"],
        userContext,
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
        message: "Email is same as the current one.",
        status: "EMAIL_SAME_AS_CURRENT_ERROR",
      });
    }

    if (
      config.user.features?.signUp?.emailVerification &&
      auth.emailVerification
    ) {
      const isVerified = await auth.emailVerification.isEmailVerified(
        user.id,
        email,
      );

      if (!isVerified) {
        const users = (await auth.emailPassword.getUsersByEmail?.(email)) || [];

        const emailPasswordRecipeUsers = users.filter(
          (user) => !(user as Record<string, unknown>).thirdParty,
        );

        if (emailPasswordRecipeUsers.length > 0) {
          return reply.send({
            status: "EMAIL_ALREADY_EXISTS_ERROR",
          });
        }

        const token = await auth.emailVerification.createEmailVerificationToken(
          user.id,
          email,
          userContext,
        );

        if (token) {
          await auth.emailVerification.sendVerificationEmail?.({
            appOrigin: config.appOrigin[0] as string,
            email,
            token,
            userContext,
            userId: user.id,
          });

          return reply.send({
            message: "A verification link has been sent to your email.",
            status: "OK",
          });
        }

        return reply.send({ status: "EMAIL_VERIFICATION_TOKEN_FAILED" });
      }
    }

    const userService = getUserService(config, slonik);

    const response = await userService.changeEmail(user.id, email);

    request.user = response;

    return reply.send({ message: "Email updated successfully.", status: "OK" });
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
