import type { FastifyReply, FastifyRequest } from "fastify";
import type { MercuriusContext } from "mercurius";

import { auth } from "./auth/adapter";

const userContext = async (
  context: MercuriusContext,
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    request.session = (await auth.session.getSession(request, reply, {
      sessionRequired: false,
      skipClaims: ["emailVerification", "profileValidation"],
    })) as (typeof request)["session"];
  } catch (error) {
    if (!auth.errors.isAuthError(error)) {
      throw error;
    }
  }

  context.user = request.user;
  context.roles = request.user?.roles;
};

export default userContext;
