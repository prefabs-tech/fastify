# `@prefabs.tech/fastify-worker` — Developer Guide

## Installation

### For package consumers

```bash
npm install @prefabs.tech/fastify-worker @prefabs.tech/fastify-config
```

Optional peers (install for the providers you use):

```bash
npm install bullmq
npm install @aws-sdk/client-sqs
```

```bash
pnpm add @prefabs.tech/fastify-worker @prefabs.tech/fastify-config
```

```bash
pnpm add bullmq
pnpm add @aws-sdk/client-sqs
```

### For monorepo development

```bash
pnpm install
pnpm --filter @prefabs.tech/fastify-worker test
pnpm --filter @prefabs.tech/fastify-worker build
```

## Setup

Register [`@prefabs.tech/fastify-config`](https://www.npmjs.com/package/@prefabs.tech/fastify-config) **before** `@prefabs.tech/fastify-worker` so `fastify.config.worker` exists. Optionally install `bullmq` and/or `@aws-sdk/client-sqs` for those queue providers.

**All Fastify-centric examples below assume:**

```typescript
import configPlugin from "@prefabs.tech/fastify-config";
import workerPlugin from "@prefabs.tech/fastify-worker";
import Fastify from "fastify";

import type { ApiConfig } from "@prefabs.tech/fastify-config";
import { QueueProvider } from "@prefabs.tech/fastify-worker";

const config: ApiConfig = {
  // …other application config required by ApiConfig shape…
  worker: {
    cronJobs: [],
    queues: [],
  },
};

const fastify = Fastify({ logger: true });

await fastify.register(configPlugin, { config });
await fastify.register(workerPlugin);
```

If `config.worker` is omitted at runtime, the worker plugin logs a warning and does **not** decorate `fastify.worker`; see [Fastify plugin and lifecycle](#fastify-plugin-and-lifecycle).

---

## Base Libraries

### [`node-cron`](https://www.npmjs.com/package/node-cron) — Modified

We schedule jobs through `cron.schedule` with your expression, async task, and optional `TaskOptions`, but never return individual handles—only bulk `stopAll()` clears everything.

→ **Their docs:** [node-cron](https://www.npmjs.com/package/node-cron)

We change nothing about `schedule` inputs; we add internal task tracking plus wiring into `JobOrchestrator` shutdown.

**What we add on top:** `CronScheduler` that stores tasks and exposes `schedule` / `stopAll` coordinated with orchestrator lifecycle.

---

### [`bullmq`](https://www.npmjs.com/package/bullmq) — Modified

We expose a single path: construct `Queue` + `Worker` from your options, forward `JobsOptions` through `push`, and surface only **`error`** and **`failed`** as optional callbacks. We fix the BullMQ job name to the configured queue adapter name (`queue.add(queueName, data, opts)`).

→ **Their docs:** [BullMQ](https://bullmq.io/) · [npm](https://www.npmjs.com/package/bullmq)

**What changes vs using BullMQ directly:**

- `workerOptions` defaults **`connection`** from `queueOptions.connection` unless you override.
- No built-in forwarding of other worker events (`completed`, `progress`, …) — only optional `onError` / `onFailed`.
- `push` resolves to the added job **id string** wrapped on failure.

**What we add on top:** uniform `QueueAdapter` API, orchestrator/registry integration, lifecycle `start` / `shutdown`, and consistent error wording on enqueue failure.

---

### [`@aws-sdk/client-sqs`](https://www.npmjs.com/package/@aws-sdk/client-sqs) — Modified

Consumer shape is **`SQSAdapterConfig`**, not raw SDK primitives: we build a long-polling receive loop with defaults, backoff, JSON bodies, parallel batch handling, and delete-on-success.

→ **Their docs:** [AWS SDK v3 — SQS](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sqs/) · [npm](https://www.npmjs.com/package/@aws-sdk/client-sqs)

**What changes:**

- Default **`WaitTimeSeconds: 20`**, overwritten if you pass it in `receiveMessageOptions`.
- Receive errors trigger exponential backoff (~500 ms doubling, cap 8000 ms + jitter) instead of spinning.
- **`Body`**: JSON only; invalid/missing body → optional `onError`, message **left** on queue (no delete).
- Handler error → optional `onError`, message **not deleted** → redelivery.
- Handler success → `DeleteMessageCommand`.
- Shutdown waits for inflight polling before `destroy()`.

**What we add on top:** resilient poll loop + ack semantics unified with BullMQ behind `push`/`shutdown`.

---

## Features

### Fastify plugin and lifecycle

The plugin is `fastify-plugin`-wrapped so `decorate("worker")` propagates correctly. Missing `fastify.config.worker` → **`warn`** and skip (no decorator, no `onClose` hook).

```typescript
// When worker exists on config — after configPlugin:
await fastify.register(workerPlugin);
// fastify.worker is JobOrchestrator; onClose awaits orchestrator.shutdown().

// When worker is absent at runtime:
await fastify.register(workerPlugin);
// Logs: Worker configuration is missing. Skipping plugin registration
// (no decorator, no onClose hook registered by this plugin)
```

### Type augmentation

Importing `@prefabs.tech/fastify-worker` augments **`ApiConfig.worker`** and **`FastifyInstance.worker`** so downstream code stays typed:

```typescript
import type { FastifyInstance } from "fastify";

const routeHandler = async (fastify: FastifyInstance) => {
  const q = fastify.worker.adapters.get("emails"); // WorkerConfig drove creation
};
```

### `JobOrchestrator`: standalone vs Fastify

Same class powers the plugin internally; you may run workers without Fastify:

```typescript
import { JobOrchestrator } from "@prefabs.tech/fastify-worker";

const orchestrator = new JobOrchestrator({
  cronJobs: [{ expression: "* * * * *", task: async () => {} }],
});

await orchestrator.start();
await orchestrator.shutdown();
```

### Cron scheduling

Each `cronJobs` entry is `{ expression, task, options?: TaskOptions }`. All tasks are tracked and stopped in `CronScheduler.stopAll()` (called from `JobOrchestrator.shutdown()`):

```typescript
const config: ApiConfig = {
  // …
  worker: {
    cronJobs: [
      {
        expression: "0 9 * * 1",
        task: async () => {
          // weekly work
        },
        options: { timezone: "America/New_York" },
      },
    ],
    queues: [],
  },
};
```

### Adapter registry & factory

Queues are keyed by **`name`** (also used as BullMQ job name string). Providers are selected with `QueueProvider`; missing provider-specific blocks throw deterministic errors:

```typescript
worker: {
  queues: [
    {
      name: "mail",
      provider: QueueProvider.BULLMQ,
      bullmqConfig: {
        queueOptions: { connection: { host: "127.0.0.1", port: 6379 } },
        handler: async (_job) => {},
      },
    },
    {
      name: "ingest",
      provider: QueueProvider.SQS,
      sqsConfig: {
        queueUrl: "https://sqs.region.amazonaws.com/queue",
        clientConfig: { region: "us-east-1" },
        handler: async (_payload) => {},
      },
    },
  ],
};
```

### Enqueueing from handlers

Both adapters expose `push` on the unified base class; generics narrow payload typing:

```typescript
type Payload = { to: string };

const enqueue = async (fastify: FastifyInstance, data: Payload) => {
  const mail = fastify.worker.adapters.get<Payload>("mail");
  const id = await mail?.push(data, { attempts: 3 });
  return id;
};
```

`AdapterRegistry.shutdownAll()` runs adapter shutdown sequentially across all registered adapters (cleared after completion).

### BullMQ adapter nuances

Share Redis between queue and worker by default; diverge explicitly in `workerOptions`:

```typescript
bullmqConfig: {
  queueOptions: {
    connection: { host: "127.0.0.1", port: 6379 },
  },
  workerOptions: {
    // connection inherited from queueOptions.connection unless overridden
    concurrency: 5,
  },
  handler: async (job) => {
    // job typed as bullmq Job<FooPayload> via generic if you propagate types
  },
  onError: (err) => fastify.log.error(err),
  onFailed: (_job, err) => fastify.log.error(err),
};
```

Enqueue options pass through BullMQ `JobsOptions`:

```typescript
await mail?.push({ id: "1" }, { delay: 5_000, removeOnComplete: true });
```

### SQS adapter: receive, backoff, overrides

Tune long polling and batch size via `receiveMessageOptions` (your values win over the default **`WaitTimeSeconds: 20`**):

```typescript
sqsConfig: {
  queueUrl: "https://sqs.region.amazonaws.com/queue",
  clientConfig: { region: "us-east-1" },
  receiveMessageOptions: {
    MaxNumberOfMessages: 5,
    WaitTimeSeconds: 5,
    VisibilityTimeout: 60,
  },
  handler: async (payload: { sku: string }) => {
    // success → adapter deletes message
  },
  onError: (err, maybeMessage) => {
    console.error(err, maybeMessage?.MessageId);
  },
},
```

Enqueue spreads optional send overrides (advanced / FIFO attributes go here):

```typescript
await ingest?.push({ sku: "A" }, { MessageGroupId: "group-a" }); // FIFO example
```

### Re-exports

You may import allied symbols without duplicating peers in **`package.json`** if your bundler aligns versions:

```typescript
import { Job, Queue, SQSClient } from "@prefabs.tech/fastify-worker";
```

Prefer declaring matching optional peer deps in your app when relying on SDK/BullMQ at runtime.

---

## Use Cases

### HTTP API plus BullMQ-backed workers

You run one Fastify app with config-driven queues so routes enqueue work and the same process consumes Redis jobs via `Worker`.

```typescript
const config: ApiConfig = {
  worker: {
    queues: [
      {
        name: "reports",
        provider: QueueProvider.BULLMQ,
        bullmqConfig: {
          queueOptions: { connection: { host: "127.0.0.1", port: 6379 } },
          handler: async (job) => {
            // generate report(job.data.reportId)
          },
        },
      },
    ],
  },
} as ApiConfig; // cast if your full config is built elsewhere

await fastify.register(configPlugin, { config });
await fastify.register(workerPlugin);

fastify.post("/reports", async (request, reply) => {
  const id = await fastify.worker.adapters.get("reports")?.push({
    reportId: request.body.id,
  });
  return reply.send({ jobId: id });
});
```

### Cron maintenance + SQS ingestion

Combine scheduled tasks with an SQS consumer that parallelizes each receive batch and backs off on AWS errors.

```typescript
const config: ApiConfig = {
  worker: {
    cronJobs: [
      {
        expression: "0 * * * *",
        task: async () => {
          // hourly cleanup
        },
      },
    ],
    queues: [
      {
        name: "events",
        provider: QueueProvider.SQS,
        sqsConfig: {
          queueUrl: process.env.SQS_URL!,
          clientConfig: { region: "us-east-1" },
          receiveMessageOptions: { MaxNumberOfMessages: 10 },
          handler: async (evt) => {
            // process evt
          },
          onError: (err) => console.error(err),
        },
      },
    ],
  },
} as ApiConfig;
```

### Dedicated worker process (no HTTP)

Run `JobOrchestrator` in a script that only processes background work.

```typescript
import { JobOrchestrator, QueueProvider } from "@prefabs.tech/fastify-worker";

const orchestrator = new JobOrchestrator({
  queues: [
    {
      name: "batch",
      provider: QueueProvider.BULLMQ,
      bullmqConfig: {
        queueOptions: { connection: { host: "127.0.0.1", port: 6379 } },
        handler: async (job) => {
          // process job.data
        },
      },
    },
  ],
});

await orchestrator.start();

process.on("SIGINT", async () => {
  await orchestrator.shutdown();
  process.exit(0);
});
```

### Typed queue lookup

Use `get<Payload>` so `push` and handlers stay aligned on the same shape.

```typescript
type EmailJob = { to: string; subject: string };

const sendLater = async (fastify: FastifyInstance, job: EmailJob) => {
  const q = fastify.worker.adapters.get<EmailJob>("email");
  return q?.push(job, { attempts: 2 });
};
```
