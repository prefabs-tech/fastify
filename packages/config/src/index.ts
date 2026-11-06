import type { ApiConfig } from "./types.js";

declare module "fastify" {
  interface FastifyInstance {
    config: ApiConfig;
    hostname: string;
  }

  interface FastifyRequest {
    config: ApiConfig;
  }
}

export { default } from "./plugin.js";

export type { ApiConfig, AppConfig } from "./types.js";
