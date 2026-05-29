import type { FastifyReply, FastifyRequest } from "fastify";

import type { AuthSession } from "../../../auth/adapter";

import { auth } from "../../../auth/adapter";

const me = async (request: FastifyRequest, reply: FastifyReply) => {
  const { config, server, session, user } = request as FastifyRequest & {
    session: AuthSession;
  };

  if (!user) {
    throw server.httpErrors.unauthorized("Unauthorised");
  }

  const authUser = await auth.emailPassword.getUserById(user.id);
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

  const response = {
    ...user,
    thirdParty: (authUser as Record<string, unknown>)?.thirdParty,
  };

  reply.send(response);
};

export default me;
