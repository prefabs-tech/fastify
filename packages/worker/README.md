# @prefabs.tech/fastify-worker

A [Fastify](https://github.com/fastify/fastify) plugin for managing queue processes and cron tasks. It provides a unified interface for working with queues (BullMQ, SQS) and scheduling recurring tasks.

## Features

- **Cron Jobs**: Schedule recurring tasks using standard cron expressions
- **Queue System**: Basic queue management with support for BullMQ and AWS SQS
- **BullMQ Integration**: Redis-based message queues for high-performance background processing
- **AWS SQS Integration**: Support for Amazon Simple Queue Service

## Requirements

- [@prefabs.tech/fastify-config](https://www.npmjs.com/package/@prefabs.tech/fastify-config)

## Usage

### Register Plugin

Register the worker plugin with your Fastify instance:

```typescript
import workerPlugin from "@prefabs.tech/fastify-worker";
import configPlugin from "@prefabs.tech/fastify-config";
import Fastify from "fastify";

import config from "./config";

const start = async () => {
  // Create fastify instance
  const fastify = Fastify({
    logger: config.logger,
  });

  // Register fastify-config plugin
  await fastify.register(configPlugin, { config });

  // Register worker plugin
  await fastify.register(workerPlugin);

  await fastify.listen({
    port: config.port,
    host: "0.0.0.0",
  });
};

start();
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
        expression: "0 0 * * *", // Run daily at midnight
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
        name: "email-queue",
        provider: QueueProvider.BULLMQ,
        bullmqConfig: {
          connection: {
            host: "localhost",
            port: 6379,
          },
          concurrency: 5,
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 1000,
            },
          },
          handler: async (job) => {
            console.log(`Processing email job ${job.id}`);
            // Send email logic here
          },
        },
      },
      {
        name: "audit-log-queue",
        provider: QueueProvider.SQS,
        sqsConfig: {
          clientConfig: {
            region: "us-east-1",
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            },
          },
          queueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/audit-logs",
          maxNumberOfMessages: 10,
          waitTimeSeconds: 20,
          handler: async (message) => {
            console.log("Processing audit log", message);
          },
        },
      },
    ],
  },
};
```

## Adding Jobs to Queues

To add jobs to a registered queue, use the `QueueProcessorRegistry` to access the queue client:

```typescript
import { QueueProcessorRegistry } from "@prefabs.tech/fastify-worker";

// Get the processor for a specific queue
const processor = QueueProcessorRegistry.get("email-queue");

if (processor) {
  // Add a job to the queue
  await processor.getQueueClient().push({
    to: "user@example.com",
    subject: "Welcome!",
    body: "Hello from Fastify Worker",
  });
  
  console.log("Job added to email-queue");
} else {
  console.error("Queue not found");
}
```
