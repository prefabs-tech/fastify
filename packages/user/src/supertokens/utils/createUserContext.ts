import type { FastifyRequest } from "fastify";
import type { SessionRequest } from "supertokens-node/lib/build/framework/fastify";

import { FastifyRequest as SupertokensFastifyRequest } from "supertokens-node/lib/build/framework/fastify/framework";

// reference https://github.com/supertokens/supertokens-node/blob/0faebfae435fd661f4b6657e2ca510101da012f5/lib/ts/utils.ts#L143

const createUserContext = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userContext: any | undefined,
  request: FastifyRequest | SessionRequest,
) => {
  if (userContext === undefined) {
    userContext = {};
  }

  if (userContext._default === undefined) {
    userContext._default = {};
  }

  if (typeof userContext._default === "object") {
    userContext._default.request = new SupertokensFastifyRequest(
      request as FastifyRequest,
    );
  }

  return userContext;
};

export default createUserContext;
