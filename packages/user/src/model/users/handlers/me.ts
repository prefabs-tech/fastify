import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify/index.js";

import { EmailVerificationClaim } from "supertokens-node/recipe/emailverification/index.js";
import { getUserById } from "supertokens-node/recipe/thirdpartyemailpassword/index.js";

import withGrants from "../../../lib/withGrants.js";
import createUserContext from "../../../supertokens/utils/createUserContext.js";
import ProfileValidationClaim from "../../../supertokens/utils/profileValidationClaim.js";

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

  reply.send(await withGrants(response, server));
};

export default me;
