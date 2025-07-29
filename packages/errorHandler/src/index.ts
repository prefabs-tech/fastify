import type { ApiConfig } from "./types";

declare module "fastify" {
  interface FastifyInstance {
    config: ApiConfig;
    hostname: string;
  }

  interface FastifyRequest {
    config: ApiConfig;
  }
}

export { default } from "./plugin";

export { default as parse } from "./parse";

export type { ApiConfig, AppConfig } from "./types";
