import type { HttpErrors } from "@fastify/sensible";

declare module "fastify" {
  interface FastifyInstance {
    httpErrors: HttpErrors;
  }
}

export { errorHandler } from "./errorHandler.js";

export { default } from "./plugin.js";

export type * from "./types.js";

export { CustomError } from "./utils/error.js";

export type { HttpErrors } from "@fastify/sensible";

export { default as StackTracey } from "stacktracey";
