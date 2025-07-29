import type { HttpErrors } from "@fastify/sensible";

declare module "fastify" {
  interface FastifyInstance {
    httpErrors: HttpErrors;
  }
}

export { default } from "./plugin";

export type { ErrorResponse } from "./types";
