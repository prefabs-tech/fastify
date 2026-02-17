import "@prefabs.tech/fastify-config";

import { WorkerConfig } from "./types";

declare module "@prefabs.tech/fastify-config" {
  interface ApiConfig {
    worker: WorkerConfig;
  }
}

export * from "./enum";

export { default } from "./plugin";

export { addToQueue } from "./queue";

export type { WorkerConfig } from "./types";
