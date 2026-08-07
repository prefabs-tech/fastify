import type { FastifyReply, FastifyRequest } from "fastify";

import { formatDate } from "@prefabs.tech/fastify-slonik";

import type { User } from "../../../types";

import { auth } from "../../../auth/adapter";
import getInvitationService from "../../../lib/getInvitationService";
import isInvitationValid from "../../../lib/isInvitationValid";
import validateEmail from "../../../validator/email";
import validatePassword from "../../../validator/password";

interface FieldInput {
  email: string;
  password: string;
}

const acceptInvitation = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const { body, config, dbSchema, log, params, slonik } =
    request as FastifyRequest<{
      Body: FieldInput;
    }>;

  const { token } = params as { token: string };

  const { email, password } = body;

  //  check if the email is valid
  const emailResult = validateEmail(email, config);

  if (!emailResult.success) {
    throw request.server.httpErrors.unprocessableEntity(
      emailResult.message || "Invalid email",
    );
  }

  // password strength validation
  const passwordStrength = validatePassword(password, config);

  if (!passwordStrength.success) {
    throw request.server.httpErrors.unprocessableEntity(
      emailResult.message || "Invalid password",
    );
  }

  const service = getInvitationService(config, slonik, dbSchema);

  const invitation = await service.findByToken(token);

  // validate the invitation
  if (!invitation || !isInvitationValid(invitation)) {
    throw request.server.httpErrors.unprocessableEntity(
      "Invitation is invalid or has expired",
    );
  }

  // compare the FieldInput email to the invitation email
  if (invitation.email != email) {
    throw request.server.httpErrors.unprocessableEntity(
      "Email do not match with the invitation",
    );
  }

  // signup
  const signUpResponse = await auth.emailPassword.emailPasswordSignUp(
    email,
    password,
    {
      autoVerifyEmail: true,
      roles: [invitation.role],
    },
  );

  if (!signUpResponse.success) {
    throw request.server.httpErrors.unprocessableEntity(
      signUpResponse.error || "EMAIL_ALREADY_EXISTS_ERROR",
    );
  }

  // update invitation's acceptedAt value with current time
  await service.update(invitation.id, {
    acceptedAt: formatDate(new Date(Date.now())),
  });

  // run post accept hook
  try {
    await config.user.invitation?.postAccept?.(
      request,
      invitation,
      signUpResponse.user as unknown as User,
    );
  } catch (error) {
    log.error(error);
  }

  // create new session so the user be logged in on signup
  await auth.session.createNewSession(request, reply, signUpResponse.user.id);

  reply.send({
    status: "OK",
    user: {
      ...signUpResponse.user,
      roles: [invitation.role],
    },
  });
};

export default acceptInvitation;
