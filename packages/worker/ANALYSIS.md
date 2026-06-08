<!-- Package analysis — produced by /analyze-package. Do not edit manually. -->

# `@prefabs.tech/fastify-worker` — Package Analysis

A Fastify plugin that orchestrates background work: recurring cron jobs (via `node-cron`) and pluggable queue adapters (BullMQ, SQS) behind a uniform `QueueAdapter` interface and `AdapterRegistry`. The same orchestrator can also be used standalone (without Fastify) via `JobOrchestrator`.

## Base Library Passthrough Analysis

### `node-cron` — MODIFIED (thin wrapper)

- Options type: `TaskOptions` is imported and exposed verbatim on `CronJob.options`.
- Options passed: unmodified. `CronScheduler.schedule()` calls `cron.schedule(job.expression, job.task, job.options)` directly.
- Features restricted: none of `cron.schedule` is restricted, but we never expose individual `ScheduledTask` handles — callers only get bulk lifecycle (`scheduler.stopAll()`).
- Features added:
  - Tracking of every scheduled task in an internal array so `stopAll()` can stop the whole set and reset the registry.
  - Integration into `JobOrchestrator.start/shutdown` so cron jobs are bound to the Fastify lifecycle.

### `bullmq` — MODIFIED

- Options type: we define `BullMQAdapterConfig<Payload>` that wraps bullmq types — `QueueOptions`, `WorkerOptions`, `Job`, and `JobsOptions` are passed through as-is from `bullmq`.
- Options passed: mostly unmodified, with one transformation:
  - `workerOptions.connection` defaults to `queueOptions.connection` if not overridden (i.e., the connection is shared by default but can be diverged).
  - `push()` always uses `this.queueName` as the job name; callers cannot pass a custom name.
- Features restricted:
  - No direct exposure of `QueueEvents` / `FlowProducer` / `JobScheduler` — only `Queue` + `Worker`.
  - Only two worker events are surfaced via callbacks: `error` and `failed` (no `completed`, `active`, `progress`, `drained`, etc.).
  - `push` returns `job.id!` (non-null assertion); callers don't get the full `Job` instance back.
- Features added:
  - Pluggable `onError(error)` and `onFailed(job, error)` callbacks.
  - Custom error wrapping in `push()`: `"Failed to push job to BullMQ queue: ${name}. Error: ${message}"`.
  - Lifecycle methods (`start`, `shutdown`) consistent with `SQSAdapter` so both can be uniformly managed by `AdapterRegistry` / `JobOrchestrator`.
  - Conforms to the `QueueAdapter<Payload>` abstract interface (`queueName`, `start`, `shutdown`, `getClient`, `push`).

### `@aws-sdk/client-sqs` — MODIFIED

- Options type: `SQSAdapterConfig<Payload>` is a custom shape. It accepts `SQSClientConfig` and `ReceiveMessageCommandInput` from the SDK verbatim, but we own everything else (`handler`, `onError`, `queueUrl`).
- Options passed:
  - `SQSClient` is constructed with `config.clientConfig` directly.
  - `ReceiveMessageCommand` is built with `QueueUrl: config.queueUrl` and a default `WaitTimeSeconds: 20`, then spreads `config.receiveMessageOptions` last (so callers can override `WaitTimeSeconds`, set `MaxNumberOfMessages`, etc.).
  - `DeleteMessageCommand` always uses `config.queueUrl` and the in-flight message's `ReceiptHandle`.
  - `SendMessageCommand` always uses `config.queueUrl` and a JSON-stringified body; caller-provided `options` are spread last and may override `MessageBody` / `QueueUrl`.
- Features restricted:
  - No FIFO-specific helpers exposed (callers must pass `MessageGroupId`/`MessageDeduplicationId` via `push` options).
  - No batch send/receive / change-visibility commands.
  - Messages are always JSON-parsed; raw / binary payloads are not supported.
- Features added:
  - Long-polling **default** (`WaitTimeSeconds: 20`).
  - Continuous poll loop (`startPolling` / `poll`) that is idempotent (guarded by `isPolling`).
  - **Exponential backoff with jitter** on `ReceiveMessageCommand` failure: base 500 ms, doubling each consecutive error, capped at 8000 ms, plus ~25% random jitter.
  - Parallel processing of received messages (`Promise.all` over `response.Messages`).
  - JSON parsing of `message.Body` with explicit empty/`null` body check; parse failures route to `onError(error, message)` and the message is **not** deleted.
  - Handler-success deletes the message via `DeleteMessageCommand`; handler-failure routes to `onError(error, message)` and leaves the message for redelivery.
  - Graceful shutdown: flips `isPolling = false`, awaits the in-flight `pollPromise`, then calls `client.destroy()`. Comment explicitly notes this avoids "client destroyed" errors and lets in-progress handlers finish.
  - Custom error wrapping in `push()`: `"Failed to push job to SQS queue: ${name}. Error: ${message}"`.
  - Conforms to the `QueueAdapter<Payload>` abstract interface.

## Summary

### Public exports

- **default export** (`plugin.ts`) — `fastify-plugin`-wrapped Fastify plugin.
- `JobOrchestrator` (class) — top-level orchestrator. Constructor takes `WorkerConfig`. Exposes:
  - `adapters: AdapterRegistry` (readonly).
  - `cron: CronScheduler` (readonly).
  - `start(): Promise<void>` — schedules every `cronJobs[i]` and creates/starts every `queues[i]` adapter, adding it to the registry.
  - `shutdown(): Promise<void>` — calls `cron.stopAll()` then `adapters.shutdownAll()`.
- `CronScheduler` (class) — thin `node-cron` wrapper with `schedule(job)` and `stopAll()`; tracks tasks internally.
- `AdapterRegistry` (class) — `Map<string, QueueAdapter>` keyed by `adapter.queueName`. Methods: `add`, `get<Payload>(name)`, `getAll()`, `has(name)`, `remove(name)`, `shutdownAll()` (awaits each `adapter.shutdown()` in sequence, then clears the map).
- `createQueueAdapter<Payload>(config)` (factory) — switch on `config.provider`:
  - `BULLMQ` → requires `bullmqConfig`, otherwise throws `"BullMQ configuration is required for queue: ${name}"`.
  - `SQS` → requires `sqsConfig`, otherwise throws `"SQS configuration is required for queue: ${name}"`.
  - default → throws `"Unsupported queue provider: ${provider}"`.
- `QueueAdapter<Payload>` (abstract class) — common interface: `queueName`, `start()`, `shutdown()`, `getClient()`, `push(data, options?)`.
- `BullMQAdapter<Payload>` (class) — concrete adapter (see passthrough analysis).
- `SQSAdapter<Payload>` (class) — concrete adapter (see passthrough analysis).
- `BullMQAdapterConfig<Payload>`, `SQSAdapterConfig<Payload>`, `WorkerConfig`, `CronJob`, `QueueConfig<Payload>` (types).
- `QueueProvider` enum — `SQS = "sqs"`, `BULLMQ = "bullmq"`.
- Re-exports: `SQSClient` (from `@aws-sdk/client-sqs`), `Job`, `Queue` (from `bullmq`) — exposed so consumers don't need to add direct deps to access types/values.

### Framework constructs added

- **Module augmentation** of `@prefabs.tech/fastify-config`'s `ApiConfig` interface — adds `worker: WorkerConfig`, so `fastify.config.worker` is type-safe everywhere downstream.
- **Module augmentation** of `fastify`'s `FastifyInstance` — adds `worker: JobOrchestrator`.
- **`fastify-plugin`-wrapped plugin** — `FastifyPlugin(plugin)` so the decoration leaks out of its encapsulation context and is visible on the parent instance.
- **Instance decorator** — `fastify.decorate("worker", jobOrchestrator)`.
- **`onClose` hook** — async hook that logs `"Shutting down worker"` and awaits `jobOrchestrator.shutdown()`.

### Hooks / lifecycle registrations

- `fastify.addHook("onClose", ...)` — drains cron scheduler and shuts down every queue adapter when the Fastify instance closes.
- BullMQ `worker.on("error", ...)` — invokes `config.onError(error)` if provided.
- BullMQ `worker.on("failed", ...)` — invokes `config.onFailed(job, error)` if both the callback is provided **and** `job` is truthy (BullMQ may emit `failed` with `null` job in some scenarios).

### Conditional branches / feature flags / defaults

- **Plugin registration skipped** when `fastify.config.worker` is undefined (logs `"Worker configuration is missing. Skipping plugin registration"` at `warn`).
- `JobOrchestrator.start()`: cron loop runs only if `config.cronJobs` is truthy; queue loop runs only if `config.queues` is truthy. Both are optional.
- `createQueueAdapter`: throws if the per-provider config block is missing or the provider is unknown.
- `BullMQAdapter` constructor: `workerOptions` default to `{ connection: queueOptions.connection, ...config.workerOptions }` — caller can override every field including `connection`.
- `BullMQAdapter.start()`: `onError` and `onFailed` listeners are always attached, but only forward the event when the respective callback is provided in config.
- `SQSAdapter.startPolling()`: early-return if `isPolling` is already true — idempotent.
- `SQSAdapter.poll()`:
  - Default `WaitTimeSeconds: 20` is set **before** `...this.config.receiveMessageOptions`, so user-supplied `WaitTimeSeconds` wins.
  - Resets `consecutiveErrors = 0` after each successful receive.
  - Only iterates over `response.Messages` when it is non-empty.
  - After an error, calls `onError` if provided, then sleeps `computeBackoffMs(consecutiveErrors)` — but **only if** `isPolling` is still true (so shutdown is not delayed by a backoff sleep).
- `SQSAdapter.processMessage()`:
  - Throws explicitly if `message.Body` is `undefined`/`null` ("SQS message has no Body"); parse errors include the original message in the `onError` callback.
  - Parse failure: route to `onError`, **do not** delete the message → it will be redelivered after visibility timeout.
  - Handler failure: route to `onError`, **do not** delete the message → same redelivery behaviour.
  - Handler success: send `DeleteMessageCommand` with the message's `ReceiptHandle`.
- `SQSAdapter.shutdown()`: flips `isPolling = false`, awaits `pollPromise` (swallowing errors — they were already surfaced via `onError`), then `client.destroy()`. Guarded with optional chaining so a never-started adapter shuts down cleanly.
- `SQSAdapter.computeBackoffMs(attempt)`: `min(500 * 2^(attempt-1), 8000) + random()*capped*0.25`. The 25% jitter is added on top of the cap (so the actual max delay is ~10 s, not 8 s).
- `SQSAdapter.push()` / `BullMQAdapter.push()`: wrap thrown errors with package-specific message strings; otherwise return the underlying message/job ID via non-null assertion.

### Default values (we set them)

- `SQSAdapter.DEFAULT_WAIT_TIME_SECONDS = 20` (long-polling default).
- `SQSAdapter.POLL_ERROR_BASE_DELAY_MS = 500`.
- `SQSAdapter.POLL_ERROR_MAX_DELAY_MS = 8000`.
- Backoff jitter factor = `0.25` (added to capped delay).
- `BullMQAdapter` `workerOptions.connection` defaults to `queueOptions.connection`.
- `QueueProvider` enum string values: `"sqs"`, `"bullmq"`.

### Completeness checklist

- [x] Classified every public export as "ours" or "theirs".
- [x] Listed every framework construct added (module augmentation, plugin wrapping, decorator, hook).
- [x] Identified every conditional branch (missing config skip, optional callbacks, idempotent polling, error-path no-delete behaviour, default-then-spread option ordering).
- [x] Documented default values (poll wait, backoff base/max/jitter, worker connection fallback, enum values).
- [x] Produced passthrough classification for every wrapped dependency (`node-cron`, `bullmq`, `@aws-sdk/client-sqs`).
