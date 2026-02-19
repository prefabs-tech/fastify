import "@prefabs.tech/fastify-config";

import { WorkerConfig } from "./types";

declare module "@prefabs.tech/fastify-config" {
  interface ApiConfig {
    worker: WorkerConfig;
  }
}

export { default } from "./plugin";

export * from "./enum";
export * from "./queue";

export { SQSClient } from "@aws-sdk/client-sqs";
export { Job, Queue } from "bullmq";

export type { WorkerConfig } from "./types";
