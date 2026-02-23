# @prefabs.tech/fastify-worker

A [Fastify](https://github.com/fastify/fastify) plugin for managing queue processes and cron tasks. It provides a unified interface for working with queues (BullMQ, SQS) and scheduling recurring tasks.

## Features

- **Cron Jobs**: Schedule recurring tasks using standard cron expressions
- **Queue System**: Queue management with support for BullMQ and AWS SQS
- **BullMQ Integration**: Redis-based message queues for high-performance background processing
- **AWS SQS Integration**: Support for Amazon Simple Queue Service

## Requirements
- [@prefabs.tech/fastify-config](https://www.npmjs.com/package/@prefabs.tech/fastify-config)

## Usage

### Fastify Plugin

Register the worker plugin with your Fastify instance:

```typescript
import workerPlugin from "@prefabs.tech/fastify-worker";
import Fastify from "fastify";

import config from "./config";

const start = async () => {
  const fastify = Fastify({
    logger: config.logger,
  });

  await fastify.register(workerPlugin);

  await fastify.listen({
    port: config.port,
    host: "0.0.0.0",
  });
};

start();
```

### Pushing to the queue

The `AdapterRegistry` is a singleton. Once the plugin initializes the worker, any service can access the same registry directly — no instance passing required:

```typescript
await fastify.register(workerPlugin);
```

```typescript
import { JobOrchestrator } from "@prefabs.tech/fastify-worker";

const queue = JobOrchestrator.adapters.get("queue-name")

if (queue) {
  queue.push({ message: 'Hello world!' })
}
```

The plugin creates the `JobOrchestrator` instance, which populates `JobOrchestrator.adapters` on `start()`. Services import `JobOrchestrator` and access the static registry directly. On fastify close, `jobOrchestrator.shutdown()` drains all adapters.

### Standalone

Use the `JobOrchestrator` class directly without Fastify:

```typescript
import { JobOrchestrator } from "@prefabs.tech/fastify-worker";

const jobOrchestrator = new JobOrchestrator({
  cronJobs: [...],
  queues: [...],
});

await jobOrchestrator.start();

// later...
await jobOrchestrator.shutdown();
```

## Configuration

Add worker configuration to your config:

```typescript
import { QueueProvider } from "@prefabs.tech/fastify-worker";
import type { ApiConfig } from "@prefabs.tech/fastify-config";

const config: ApiConfig = {
  // ...other config
  worker: {
    cronJobs: [
      {
        expression: "0 0 * * *",
        task: async () => {
          console.log("Running daily cleanup...");
        },
        options: {
          scheduled: true,
          timezone: "UTC",
        },
      },
    ],
    queues: [
      {
        name: "bull-queue",
        provider: QueueProvider.BULLMQ,
        bullmqConfig: {
          handler: async (job) => {
            //
          },
          queueOptions: {
            connection: {
              host: "localhost",
              port: 6379,
            },
          },
        },
      },
      {
        name: "sqs-queue",
        provider: QueueProvider.SQS,
        sqsConfig: {
          clientConfig: {
            credentials: {
              accessKeyId: "",
              secretAccessKey: "",
            },
            endpoint: "",
            region: "",
          },
          handler: async (message) => {
            //
          },
          queueUrl: "",
        },
      },
    ],
  },
};
```
