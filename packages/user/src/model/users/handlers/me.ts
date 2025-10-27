import { EmailVerificationClaim } from "supertokens-node/recipe/emailverification";
import { getUserById } from "supertokens-node/recipe/thirdpartyemailpassword";

import createUserContext from "../../../supertokens/utils/createUserContext";
import ProfileValidationClaim from "../../../supertokens/utils/profileValidationClaim";

import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify";

const me = async (request: SessionRequest, reply: FastifyReply) => {
  const { config, server, session, user } = request;

  if (!user) {
    throw server.httpErrors.unauthorized("Unauthorised");
  }

  const authUser = await getUserById(user.id);

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

  const response = {
    ...user,
    thirdParty: authUser?.thirdParty,
  };

  reply.send(response);
};

export default me;
