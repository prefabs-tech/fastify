import { verifySession } from "supertokens-node/recipe/session/framework/fastify";

declare module "fastify" {
  interface FastifyInstance {
    verifySession: typeof verifySession;
  }
}

export { default } from "./plugin";

export type { SupertokensConfig } from "./types";
