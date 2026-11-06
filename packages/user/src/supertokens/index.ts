import type { SessionContainer } from "supertokens-node/recipe/session/index.js";

import { verifySession } from "supertokens-node/recipe/session/framework/fastify/index.js";

declare module "fastify" {
  interface FastifyInstance {
    verifySession: typeof verifySession;
  }

  interface FastifyRequest {
    session?: SessionContainer;
  }
}

export { default } from "./plugin.js";

export type { SupertokensConfig } from "./types/index.js";
