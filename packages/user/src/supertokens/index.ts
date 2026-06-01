import type { FastifyReply, FastifyRequest } from "fastify";

import type { AuthSession, GetSessionOptions } from "../auth/adapter";

declare module "fastify" {
  interface FastifyInstance {
    verifySession(
      options?: GetSessionOptions,
    ): (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<AuthSession | undefined>;
  }
}

export { default } from "./plugin";

export type { SupertokensConfig } from "./types";
