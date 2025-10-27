import { EmailVerificationClaim } from "supertokens-node/recipe/emailverification";
import { getUserById } from "supertokens-node/recipe/thirdpartyemailpassword";

import getUserService from "../../../lib/getUserService";
import createUserContext from "../../../supertokens/utils/createUserContext";
import ProfileValidationClaim from "../../../supertokens/utils/profileValidationClaim";

import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify";

const removePhoto = async (request: SessionRequest, reply: FastifyReply) => {
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

  const authUser = await getUserById(user.id);

  if (request.config.user.features?.profileValidation?.enabled) {
    await request.session?.fetchAndSetClaim(
      new ProfileValidationClaim(),
      createUserContext(undefined, request),
    );
  }

  if (request.config.user.features?.signUp?.emailVerification) {
    await request.session?.fetchAndSetClaim(
      EmailVerificationClaim,
      createUserContext(undefined, request),
    );
  }

  const response = {
    ...updatedUser,
    thirdParty: authUser?.thirdParty,
  };

  reply.send(response);
};

export default removePhoto;
