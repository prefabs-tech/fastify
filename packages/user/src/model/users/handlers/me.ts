import type { FastifyReply, FastifyRequest } from "fastify";

import { auth, getRequiredSession } from "../../../auth/adapter";

const me = async (request: FastifyRequest, reply: FastifyReply) => {
  const { config, server, user } = request;
  const session = getRequiredSession(request);

  if (!user) {
    throw server.httpErrors.unauthorized("Unauthorised");
  }

  const authUser = await auth.emailPassword.getUserById(user.id);
  const userContext = auth.createUserContext(request);

  if (config.user.features?.profileValidation?.enabled && auth.claims) {
    await auth.claims.refreshSessionClaims(
      session,
      request,
      ["profileValidation"],
      userContext,
    );
  }

  if (config.user.features?.signUp?.emailVerification && auth.claims) {
    await auth.claims.refreshSessionClaims(
      session,
      request,
      ["emailVerification"],
      userContext,
    );
  }

  const response = {
    ...user,
    thirdParty: authUser?.thirdParty,
  };

  reply.send(response);
};

export default me;
