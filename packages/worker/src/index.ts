import "@prefabs.tech/fastify-config";

import { WorkerConfig } from "./types";

declare module "@prefabs.tech/fastify-config" {
  interface ApiConfig {
    worker: WorkerConfig;
  }
}

export { SQSClient } from "@aws-sdk/client-sqs";
export { Job, Queue } from "bullmq";

export { default } from "./plugin";

export * from "./enum";
export * from "./queue";
export * from "./types";
