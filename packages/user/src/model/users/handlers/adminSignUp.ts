import type { FastifyReply, FastifyRequest } from "fastify";

import { auth } from "../../../auth/adapter";
import { ROLE_ADMIN, ROLE_SUPERADMIN } from "../../../constants";
import validateEmail from "../../../validator/email";
import validatePassword from "../../../validator/password";

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
  const adminUsers = await auth.roles.getUsersThatHaveRole(ROLE_ADMIN);
  const superAdminUsers =
    await auth.roles.getUsersThatHaveRole(ROLE_SUPERADMIN);

  if (adminUsers.length === 0 && superAdminUsers.length === 0) {
    const allRoles = await auth.roles.getAllRoles();
    if (!allRoles.includes(ROLE_ADMIN) && !allRoles.includes(ROLE_SUPERADMIN)) {
      throw server.httpErrors.unprocessableEntity("Required roles not found");
    }
  } else if (adminUsers.length > 0 || superAdminUsers.length > 0) {
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
  const signUpResponse = await auth.emailPassword.emailPasswordSignUp(
    email,
    password,
    {
      _default: {
        request: {
          request,
        },
      },
      autoVerifyEmail: true,
      roles: [
        ROLE_ADMIN,
        ...(superAdminUsers.length === 0 ? [ROLE_SUPERADMIN] : []),
      ],
    },
  );

  if (!signUpResponse.success) {
    return reply.send({ status: signUpResponse.error });
  }

  // create new session so the user be logged in on signup
  await auth.session.createNewSession(request, reply, signUpResponse.user.id);

  reply.send({ status: "OK", user: signUpResponse.user });
};

export default adminSignUp;
