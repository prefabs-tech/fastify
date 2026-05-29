import type { FastifyReply, FastifyRequest } from "fastify";

import type { AuthSession } from "../../../auth/adapter";

import { auth } from "../../../auth/adapter";
import getUserService from "../../../lib/getUserService";

const removePhoto = async (request: FastifyRequest, reply: FastifyReply) => {
  const { config, dbSchema, server, slonik, user } = request;

  if (!user) {
    throw server.httpErrors.unauthorized("Unauthorised");
  }

  const service = getUserService(config, slonik, dbSchema);

  // eslint-disable-next-line unicorn/no-null
  const updatedUser = await service.update(user.id, { photoId: null });

  if (user.photoId) {
    await service.fileService.delete(user.photoId);
  }

  request.user = updatedUser;

  const authUser = await auth.emailPassword.getUserById(user.id);
  const userContext = auth.createUserContext(request);

  const session = (request as FastifyRequest & { session: AuthSession })
    .session;

  if (request.config.user.features?.profileValidation?.enabled) {
    await auth.claims.refreshSessionClaims(
      session,
      request,
      ["profileValidation"],
      userContext,
    );
  }

  if (request.config.user.features?.signUp?.emailVerification) {
    await auth.claims.refreshSessionClaims(
      session,
      request,
      ["emailVerification"],
      userContext,
    );
  }

  const response = {
    ...updatedUser,
    thirdParty: (authUser as Record<string, unknown>)?.thirdParty,
  };

  reply.send(response);
};

export default removePhoto;
