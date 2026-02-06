import "@prefabs.tech/fastify-config";

import { WorkerConfig } from "./types";

declare module "@prefabs.tech/fastify-config" {
  interface ApiConfig {
    worker: WorkerConfig;
  }
}

export type { WorkerConfig } from "./types";
