import type { HttpErrors } from "@fastify/sensible";
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import type { ApiConfig } from "@prefabs.tech/fastify-config";

declare module "fastify" {
  interface FastifyInstance {
    httpErrors: HttpErrors;
  }
}

declare module "@prefabs.tech/fastify-config" {
  interface ApiConfig {
    errorHandler: {
      stackTrace?: boolean;
    };
  }
}

export { default } from "./plugin";

export type { ErrorResponse } from "./types";

export type { HttpErrors } from "@fastify/sensible";
