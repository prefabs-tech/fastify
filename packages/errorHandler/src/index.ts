/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import type { ApiConfig } from "@prefabs.tech/fastify-config";

declare module "@prefabs.tech/fastify-config" {
  interface ApiConfig {
    errorHandler: {
      stackTrace?: boolean;
    };
  }
}

export { errorHandler } from "./errorHandler";

export { CustomError } from "./utils/error";

export type { ErrorResponse } from "./types";
