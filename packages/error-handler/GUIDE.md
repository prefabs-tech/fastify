# @prefabs.tech/fastify-error-handler — Developer Guide

## Installation

### For package consumers

```bash
npm install @prefabs.tech/fastify-error-handler
```

```bash
pnpm add @prefabs.tech/fastify-error-handler
```

### For monorepo development

```bash
pnpm install
pnpm --filter @prefabs.tech/fastify-error-handler test
pnpm --filter @prefabs.tech/fastify-error-handler build
```

## Setup

Register the plugin once at startup. All subsequent examples assume this setup.

```typescript
import Fastify from "fastify";
import errorHandlerPlugin from "@prefabs.tech/fastify-error-handler";

const fastify = Fastify();

await fastify.register(errorHandlerPlugin, {
  stackTrace: false, // optional, default: false
  preErrorHandler: undefined, // optional
});
```

---

## Base Libraries

### @fastify/sensible — Modified

Provides HTTP error factory methods and the `HttpError` class.

→ **Their docs:** [@fastify/sensible](https://github.com/fastify/fastify-sensible)

`@fastify/sensible` is registered automatically with its defaults, but this package does not expose `@fastify/sensible` plugin options.

**What we add on top:** Unified error handling for `HttpError` instances with severity-based logging, response shaping, optional stack trace output, and pre-handler interception via `preErrorHandler`.

### stacktracey — Modified

Parses `Error.stack` into structured frames.

→ **Their docs:** [stacktracey](https://www.npmjs.com/package/stacktracey)

We use `StackTracey` internally to parse stack traces and expose them in error responses as `StackTracey.Entry[]` arrays.

**What we add on top:** `StackTracey` is re-exported from this package for use in consuming code.

---

## Features

### Global error handler

The plugin installs a `setErrorHandler` that catches all unhandled errors thrown from routes and plugins. Non-`Error` values (strings, `null`, etc.) are coerced to `new Error("UNKNOWN_ERROR")` before processing.

```typescript
fastify.get("/boom", async () => {
  throw new Error("Something went wrong");
});
// → 500 response with masked message
```

### HttpError handling

Errors that are `instanceof HttpError` — thrown via `fastify.httpErrors.*` — respond with the error's original status code, `error` (HTTP status text), `message`, and `name`.

```typescript
fastify.get("/forbidden", async () => {
  throw fastify.httpErrors.forbidden("You cannot access this");
  // → 403 { statusCode: 403, error: "Forbidden", message: "You cannot access this", name: "..." }
});
```

### Non-HttpError handling — error masking

All non-`HttpError` errors (plain `Error`, `CustomError`, and any subclass) always respond with status `500`. When `stackTrace: false` (the default), internal details are masked:

- `message` → `"Server error, please contact support"`
- `name` → `"Error"`
- `code` → `"INTERNAL_SERVER_ERROR"`

For `CustomError` instances, message is replaced with `"Server has an error that is not handled, please contact support"`.

When `stackTrace: true`, the actual `message`, `name`, and `code` are included in the response.

### Severity-based logging for HttpErrors

The log level depends on the error's status code:

- `5xx` → logged at `error` level
- `4xx` → logged at `info` level
- below `400` → logged at `error` level

Non-HttpErrors are always logged at `error` level regardless of `stackTrace` setting.

### `stackTrace` option and decorator

Controls whether parsed stack frames appear in error responses. Defaults to `false`.

```typescript
await fastify.register(errorHandlerPlugin, { stackTrace: true });
```

The current value is accessible at runtime via `fastify.stackTrace`:

```typescript
fastify.get("/debug", async () => {
  return { stackTraceEnabled: fastify.stackTrace };
});
```

When enabled, error responses include a `stack` array of `StackTracey.Entry` objects (file, line, column, callee). The field is omitted if the error has no `.stack` property.

### `preErrorHandler` option

An optional async function called before the default error handler. Useful for intercepting errors from third-party libraries (e.g. auth middleware) before our default response logic runs.

```typescript
await fastify.register(errorHandlerPlugin, {
  preErrorHandler: async (error, request, reply) => {
    if (isSupertokensError(error)) {
      await SuperTokens.errorHandler()(error, request.raw, reply.raw, () => {});
    }
  },
});
```

Behavior:

- If `preErrorHandler` sends the reply (`reply.sent === true`), the default handler is skipped entirely.
- If `preErrorHandler` throws, the exception is silently discarded and the default handler still runs.

### `ErrorResponse` JSON schema

The plugin registers an `ErrorResponse` schema (`$id: "ErrorResponse"`) with Fastify so routes can reference it in their response schemas.

```typescript
fastify.get("/data", {
  schema: {
    response: {
      400: { $ref: "ErrorResponse#" },
      500: { $ref: "ErrorResponse#" },
    },
  },
  handler: async () => {
    /* ... */
  },
});
```

### `CustomError` class

A base class for application errors with an optional `code` string. Extends `Error` with correct prototype chain (`instanceof CustomError` and `instanceof Error` both work).

```typescript
import { CustomError } from "@prefabs.tech/fastify-error-handler";

throw new CustomError("Payment failed", "PAYMENT_FAILED");
// error.code === "PAYMENT_FAILED"
// error.name === "CustomError"
```

When `stackTrace: true`, the `code` and real `message` appear in the 500 response instead of generic placeholders.

### Standalone `errorHandler` export

The error handler function is exported for use outside the plugin — for example, to reuse in tests or to compose into a custom handler.

```typescript
import { errorHandler } from "@prefabs.tech/fastify-error-handler";

fastify.setErrorHandler((error, request, reply) => {
  // custom pre-processing...
  return errorHandler(error, request, reply);
});
```

### Error response format

Every response from the error handler conforms to `ErrorResponse`:

```typescript
type ErrorResponse = {
  code?: string; // error code
  error?: string; // HTTP status text (HttpErrors only)
  message: string; // error message
  name: string; // error class name
  stack?: StackTracey.Entry[]; // parsed frames (only when stackTrace: true)
  statusCode: number; // HTTP status code
};
```

### Type and class exports

| Export                | Kind  | Description                          |
| --------------------- | ----- | ------------------------------------ |
| `ErrorHandlerOptions` | type  | Plugin options shape                 |
| `ErrorHandler`        | type  | Signature for `preErrorHandler`      |
| `ErrorResponse`       | type  | Response body shape                  |
| `CustomError`         | class | Base application error class         |
| `HttpErrors`          | type  | Re-exported from `@fastify/sensible` |
| `StackTracey`         | class | Re-exported from `stacktracey`       |

---

## Use Cases

### Handling third-party auth library errors

When using an auth library that uses its own error classes (e.g. SuperTokens), use `preErrorHandler` to intercept them before the default 500 handler fires:

```typescript
import errorHandlerPlugin from "@prefabs.tech/fastify-error-handler";
import supertokens from "supertokens-node";

await fastify.register(errorHandlerPlugin, {
  preErrorHandler: async (error, request, reply) => {
    if (
      supertokens.errorHandler &&
      supertokens.isCompatibleWithFastify(error)
    ) {
      await supertokens.errorHandler()(error, request.raw, reply.raw, () => {});
    }
  },
});
```

### Structured application errors with codes

Define domain-specific error subclasses using `CustomError` so that error codes survive into logs and (in dev/debug mode) into responses:

```typescript
import { CustomError } from "@prefabs.tech/fastify-error-handler";

class PaymentError extends CustomError {
  constructor(message: string) {
    super(message, "PAYMENT_FAILED");
  }
}

fastify.post("/pay", async () => {
  throw new PaymentError("Card declined");
  // stackTrace: false → 500 with generic message
  // stackTrace: true  → 500 with code: "PAYMENT_FAILED", message: "Card declined"
});
```

### Toggle response detail by app config

Use an application config flag to control whether stack traces are exposed in error responses:

```typescript
const appConfig = { exposeErrorStacks: false };

await fastify.register(errorHandlerPlugin, {
  stackTrace: appConfig.exposeErrorStacks,
});
```

### Referencing the error schema in route responses

Reuse the registered `ErrorResponse` schema to keep your OpenAPI output consistent:

```typescript
fastify.post("/users", {
  schema: {
    response: {
      201: userSchema,
      400: { $ref: "ErrorResponse#" },
      409: { $ref: "ErrorResponse#" },
      500: { $ref: "ErrorResponse#" },
    },
  },
  handler: async (request) => {
    // ...
  },
});
```
