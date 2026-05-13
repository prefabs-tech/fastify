# @prefabs.tech/fastify-worker

A [Fastify](https://github.com/fastify/fastify) plugin for managing queue processes and cron tasks. It provides a unified interface for working with queues (BullMQ, SQS) and scheduling recurring tasks.

## Features

- **Cron Jobs**: Schedule recurring tasks using standard cron expressions (powered by [`node-cron`](https://www.npmjs.com/package/node-cron))
- **Queue System**: Pluggable adapter registry with support for BullMQ and AWS SQS
- **BullMQ Integration**: Redis-based message queues for high-performance background processing (powered by [`bullmq`](https://www.npmjs.com/package/bullmq))
- **AWS SQS Integration**: Support for Amazon Simple Queue Service with long-polling and exponential backoff (powered by [`@aws-sdk/client-sqs`](https://www.npmjs.com/package/@aws-sdk/client-sqs))
- **Standalone or Fastify**: Use the orchestrator with Fastify (via the plugin) or directly in a non-Fastify process

## Requirements

**Peer dependencies** (install separately):

- [`fastify`](https://www.npmjs.com/package/fastify) `>=5.2.2`
- [`fastify-plugin`](https://www.npmjs.com/package/fastify-plugin) `>=5.0.1`
- [`@prefabs.tech/fastify-config`](https://www.npmjs.com/package/@prefabs.tech/fastify-config) — provides `fastify.config` which this plugin reads `config.worker` from

**Optional peer dependencies** (install only the providers you use):

- [`bullmq`](https://www.npmjs.com/package/bullmq) — required if you configure any `BULLMQ` queues
- [`@aws-sdk/client-sqs`](https://www.npmjs.com/package/@aws-sdk/client-sqs) — required if you configure any `SQS` queues

## Installation

```bash
npm install @prefabs.tech/fastify-worker @prefabs.tech/fastify-config
# plus the providers you need:
npm install bullmq
npm install @aws-sdk/client-sqs
```

## Usage

### Fastify plugin

Register `@prefabs.tech/fastify-config` first (so `fastify.config.worker` is available), then register the worker plugin:

```typescript
import configPlugin from "@prefabs.tech/fastify-config";
import workerPlugin from "@prefabs.tech/fastify-worker";
import Fastify from "fastify";

import config from "./config";

const start = async () => {
  const fastify = Fastify({ logger: config.logger });

  await fastify.register(configPlugin, { config });
  await fastify.register(workerPlugin);

  await fastify.listen({
    port: config.port,
    host: "0.0.0.0",
  });
};

start();
```

The plugin:

1. Reads `fastify.config.worker` (see [Configuration](#configuration)). If missing, it logs a warning and skips registration.
2. Creates a `JobOrchestrator` instance, starts cron jobs, and starts queue adapters.
3. Decorates the Fastify instance with `fastify.worker` (typed as `JobOrchestrator`).
4. Drains all adapters on the `onClose` hook.

### Accessing queues from your services

The plugin decorates the Fastify instance with `fastify.worker`. Inside any route or service that has the Fastify instance, use the per-instance registry:

```typescript
import type { FastifyInstance } from "fastify";

export const enqueueHello = async (fastify: FastifyInstance) => {
  const queue = fastify.worker.adapters.get("bull-queue");

  if (queue) {
    await queue.push({ message: "Hello world!" });
  }
};
```

### Standalone (without Fastify)

Use `JobOrchestrator` directly when you don't have a Fastify instance:

```typescript
import { JobOrchestrator } from "@prefabs.tech/fastify-worker";

const orchestrator = new JobOrchestrator({
  cronJobs: [
    /* ... */
  ],
  queues: [
    /* ... */
  ],
});

await orchestrator.start();

const queue = orchestrator.adapters.get("bull-queue");

await queue?.push({ message: "Hello from a standalone worker" });

// On process shutdown:
await orchestrator.shutdown();
```

## Configuration

Add a `worker` block to your `ApiConfig`:

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
            // process the job
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
            // process the message
          },
          queueUrl: "",
        },
      },
    ],
  },
};
```

### SQS long-polling

The SQS adapter uses **long-polling by default** (`WaitTimeSeconds: 20`) to avoid tight CPU loops and minimise empty receives. Override it explicitly via `receiveMessageOptions`:

```typescript
sqsConfig: {
  // ...
  receiveMessageOptions: {
    QueueUrl: "https://sqs.us-east-1.amazonaws.com/.../my-queue",
    MaxNumberOfMessages: 10,
    WaitTimeSeconds: 5,
  },
}
```

The poll loop also applies an exponential backoff (capped at ~8s) when `ReceiveMessageCommand` fails, so a transient AWS outage will not turn into a request storm.

### Typed payloads

`BullMQAdapter` and `SQSAdapter` (and the registry lookups) are generic over the payload type. Specify a payload type when retrieving the adapter to get type-safe `push` and handler signatures:

```typescript
type EmailJob = { to: string; subject: string };

const queue = fastify.worker.adapters.get<EmailJob>("email-queue");

await queue?.push({ to: "user@example.com", subject: "Welcome" });
```
