import type { FastifyInstance } from "fastify";

import supertokens from "supertokens-node";

import getRecipeList from "./recipes";

const init = (fastify: FastifyInstance) => {
  const { config } = fastify;

  supertokens.init({
    appInfo: {
      apiBasePath: config.user.supertokens.apiBasePath,
      apiDomain: config.baseUrl as string,
      appName: config.appName as string,
      websiteDomain: config.appOrigin[0] as string,
    },
    framework: "fastify",
    recipeList: getRecipeList(fastify),
    supertokens: {
      connectionURI: config.user.supertokens.connectionUri as string,
    },
  });
};

export default init;
