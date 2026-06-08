<!-- Structured feature inventory — used by automated test generation. Developer docs: see GUIDE.md -->

# FEATURES — `@prefabs.tech/fastify-worker`

## Fastify plugin and lifecycle

1. Default export is wrapped with [`fastify-plugin`](https://www.npmjs.com/package/fastify-plugin) so `fastify.worker` is visible outside the encapsulation boundary.
2. If `fastify.config.worker` is missing, logs a warning (`"Worker configuration is missing..."`) and returns without decorating or registering hooks.
3. When `worker` config is present: logs `"Registering worker plugin"`, instantiates `JobOrchestrator` with `config.worker`, awaits `start()`, decorates Fastify with `worker: JobOrchestrator`.
4. Registers an `onClose` hook that logs `"Shutting down worker"` and awaits `jobOrchestrator.shutdown()`.

## TypeScript module augmentation

5. Declares `@prefabs.tech/fastify-config` → `interface ApiConfig { worker: WorkerConfig }`.
6. Declares `fastify` → `interface FastifyInstance { worker: JobOrchestrator }`.

## Job orchestrator

7. `JobOrchestrator` constructor creates a `CronScheduler` and empty `AdapterRegistry`.
8. `start()` loops `config.cronJobs` (when present) and schedules each via `cron.schedule(...)`.
9. `start()` loops `config.queues` (when present), runs `createQueueAdapter`, awaits `adapter.start()`, then `adapters.add(adapter)`.
10. `shutdown()` calls `cron.stopAll()` then `adapters.shutdownAll()`.

## Cron scheduler

11. Internal list of scheduled tasks for bulk lifecycle (`stopAll` clears tracking after stopping).
12. `schedule(job)` forwards `expression`, async `task`, and optional `options` to [`node-cron`](https://www.npmjs.com/package/node-cron) `schedule`; does not expose per-task handles.
13. `stopAll()` stops every tracked task then resets the list.

## Queue adapter registry and factory

14. `AdapterRegistry` indexes adapters by `adapter.queueName`; `add` overwrites existing name.
15. `get<Payload>(name)`, `has(name)`, `remove(name)`, `getAll()` for registry access.
16. `shutdownAll()` awaits each adapter’s `shutdown()` in iteration order, then clears the map (after all complete).
17. `createQueueAdapter(config)` selects implementation by `config.provider`; throws `"BullMQ configuration is required for queue: …"` when `BULLMQ` without `bullmqConfig`.
18. `createQueueAdapter` throws `"SQS configuration is required for queue: …"` when `SQS` without `sqsConfig`.
19. Unknown `QueueProvider` value throws `"Unsupported queue provider: …"`.

## Unified queue abstraction

20. Abstract `QueueAdapter<Payload>` requires `queueName`, `start()`, `shutdown()`, `getClient()`, and `push(data, options?)` returning `Promise<string>` (job/message id semantics per adapter).

## BullMQ adapter additions

21. Builds `workerOptions` as `{ connection: queueOptions.connection, ...config.workerOptions }` so Worker shares Queue Redis connection unless overridden.
22. `Worker` invokes user `handler`; job forwarded as `Job<Payload>`.
23. Registers listener on worker `error` that calls optional `config.onError(error)` when provided.
24. Registers listener on worker `failed` that calls optional `config.onFailed(job, error)` only when callback exists and `job` is truthy.
25. `push` passes `jobsOptions` through to BullMQ’s `queue.add`; **job name** is fixed to adapter’s `queueName` (caller cannot rename per `add`).
26. `push` wraps failures with `Error(\`Failed to push job to BullMQ queue: ${queueName}. Error: ${message}\`)`.

## SQS adapter additions

27. `ReceiveMessageCommand` input is `{ QueueUrl, WaitTimeSeconds: 20, ...receiveMessageOptions }` so defaults long-polling but allows override via `receiveMessageOptions`.
28. `startPolling()` is idempotent: no-op when already polling (`isPolling`).
29. Poll loop invokes `ReceiveMessageCommand` repeatedly while `isPolling`; successful receive resets consecutive error counter.
30. After `ReceiveMessageCommand` fails: optional `onError`; if still polling, delays with backoff `computeBackoffMs(consecutiveErrors)`.
31. Backoff formula: capped exponential delay from base 500 ms doubling per consecutive error up to max 8000 ms, plus up to **25% of the capped delay** random jitter (`capped + random() * capped * 0.25`).
32. Non-empty batches: parallel `Promise.all` over messages; each routed through private `processMessage`.
33. `processMessage`: rejects missing/null `Body` with error surfaced via optional `onError(error, message)`.
34. Body parsed with `JSON.parse` as `Payload`; parse failures call `onError` with context and **do not delete** message (implicit redelivery after visibility expires).
35. Successful handler run calls `DeleteMessageCommand` using `queueUrl` and message `ReceiptHandle`.
36. Handler throws: optional `onError(error, message)`; message **not deleted** → redelivery.
37. `shutdown`: sets `isPolling` false; awaits inflight `pollPromise` (errors swallowed—they were surfaced in loop); then `client?.destroy()` for clean teardown.
38. `push`: `SendMessageCommand` with `QueueUrl`, `MessageBody: JSON.stringify(data)`, spread `options`; wraps failures with `"Failed to push job to SQS queue: …"` message.

## Re-exports

39. Package re-exports `SQSClient` from `@aws-sdk/client-sqs` and `Job`, `Queue` from `bullmq` for consumers relying on upstream types/helpers without declaring those peer deps separately.
