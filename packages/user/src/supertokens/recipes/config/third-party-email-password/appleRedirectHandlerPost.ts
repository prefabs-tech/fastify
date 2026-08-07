import type { FastifyInstance } from "fastify";
import type { APIInterface } from "supertokens-node/recipe/thirdpartyemailpassword/types";

const appleRedirectHandlerPOST = (
  originalImplementation: APIInterface,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  fastify: FastifyInstance,
): APIInterface["appleRedirectHandlerPOST"] => {
  return async (input) => {
    if (originalImplementation.appleRedirectHandlerPOST === undefined) {
      throw new Error("Should never come here");
    }

    const { code, state: stateInBase64 } = input.formPostInfoFromProvider;

    const state = JSON.parse(
      Buffer.from(stateInBase64, "base64").toString("ascii"),
    );

    if (state.isAndroid && state.appId) {
      const queryString = `code=${code}&state=${stateInBase64}`;

      const redirectUrl = `intent://callback?${queryString}#Intent;package=${state.appId};scheme=signinwithapple;end`;

      input.options.res.original.redirect(redirectUrl);
    } else {
      // For the web flow we can use the original implementation
      originalImplementation.appleRedirectHandlerPOST(input);
    }
  };
};

export default appleRedirectHandlerPOST;
