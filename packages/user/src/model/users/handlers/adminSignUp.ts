import { createNewSession } from "supertokens-node/recipe/session";
import { emailPasswordSignUp } from "supertokens-node/recipe/thirdpartyemailpassword";
import UserRoles from "supertokens-node/recipe/userroles";

import { ROLE_ADMIN, ROLE_SUPERADMIN } from "../../../constants";
import validateEmail from "../../../validator/email";
import validatePassword from "../../../validator/password";

import type { FastifyReply, FastifyRequest } from "fastify";

interface FieldInput {
  email: string;
  password: string;
}

const adminSignUp = async (request: FastifyRequest, reply: FastifyReply) => {
  const { body, config, server } = request as FastifyRequest<{
    Body: FieldInput;
  }>;

  const { email, password } = body;

  // check if already admin user exists
  const adminUsers = await UserRoles.getUsersThatHaveRole(ROLE_ADMIN);
  const superAdminUsers = await UserRoles.getUsersThatHaveRole(ROLE_SUPERADMIN);

  if (
    adminUsers.status === "UNKNOWN_ROLE_ERROR" &&
    superAdminUsers.status === "UNKNOWN_ROLE_ERROR"
  ) {
    throw server.httpErrors.unprocessableEntity(adminUsers.status);
  } else if (
    (adminUsers.status === "OK" && adminUsers.users.length > 0) ||
    (superAdminUsers.status === "OK" && superAdminUsers.users.length > 0)
  ) {
    throw server.httpErrors.conflict("First admin user already exists");
  }

  //  check if the email is valid
  const emailResult = validateEmail(email, config);

  if (!emailResult.success) {
    throw server.httpErrors.unprocessableEntity(
      emailResult.message || "Invalid email",
    );
  }

  // password strength validation
  const passwordStrength = validatePassword(password, config);

  if (!passwordStrength.success) {
    throw server.httpErrors.unprocessableEntity(
      passwordStrength.message || "Invalid password",
    );
  }

  // signup
  const signUpResponse = await emailPasswordSignUp(email, password, {
    autoVerifyEmail: true,
    roles: [
      ROLE_ADMIN,
      ...(superAdminUsers.status === "OK" ? [ROLE_SUPERADMIN] : []),
    ],
    _default: {
      request: {
        request,
      },
    },
  });

  if (signUpResponse.status !== "OK") {
    return reply.send(signUpResponse);
  }

  // create new session so the user be logged in on signup
  await createNewSession(request, reply, signUpResponse.user.id);

  reply.send(signUpResponse);
};

export default adminSignUp;
