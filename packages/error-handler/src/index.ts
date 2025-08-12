import type { HttpErrors } from "@fastify/sensible";

declare module "fastify" {
  interface FastifyInstance {
    httpErrors: HttpErrors;
    stackTrace: boolean;
  }
}

export { default } from "./plugin";

export { errorHandler } from "./errorHandler";

export { CustomError } from "./utils/error";

export type { HttpErrors } from "@fastify/sensible";

export type * from "./types";
