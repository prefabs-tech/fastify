import type { HttpErrors } from "@fastify/sensible";

declare module "fastify" {
  interface FastifyInstance {
    httpErrors: HttpErrors;
    stackTrace: boolean;
  }
}

export { errorHandler } from "./errorHandler";

export { default } from "./plugin";

export type * from "./types";

export { CustomError } from "./utils/error";

export type { HttpErrors } from "@fastify/sensible";

export { default as StackTracey } from "stacktracey";
