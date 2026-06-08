import "@prefabs.tech/fastify-config";

import type JobOrchestrator from "./jobOrchestrator";

import { WorkerConfig } from "./types";

declare module "@prefabs.tech/fastify-config" {
  interface ApiConfig {
    worker: WorkerConfig;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    worker: JobOrchestrator;
  }
}

export * from "./enum";
export { default as JobOrchestrator } from "./jobOrchestrator";

export { default } from "./plugin";
export * from "./queue";

export * from "./types";
export { SQSClient } from "@aws-sdk/client-sqs";
export { Job, Queue } from "bullmq";
