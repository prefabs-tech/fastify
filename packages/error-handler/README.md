# @prefabs.tech/fastify-error-handler

A [Fastify](https://github.com/fastify/fastify) plugin that provides a standardized, production-safe global error handler for APIs.

## Why This Plugin?

In a large API or microservice ecosystem, inconsistent error handling quickly leads to bloated controllers and unpredictable API responses for your frontend clients. We created this plugin to:

- **Unify Your Error Responses**: By providing a global error formatter powered by `@fastify/sensible`, we ensure that no matter where an error originates — a database crash, a validation failure, or a manual throw — your API always responds with a standardized, predictable JSON shape.
- **Keep Controllers Clean**: We enforce an exceptions-based approach. Focus purely on the happy path in your route handlers. Instead of manually catching errors and calling `reply.code(400).send(...)`, you simply `throw` an error and let the global handler manage the rest.
- **Provide Safe Interception**: Fastify only allows one global `setErrorHandler`. If you use libraries like SuperTokens that require their own error handling, standard setups break. We designed a clean `preErrorHandler` option to let you safely run those third-party hooks before falling back to the standard global formatter.
- **Standardize Custom Exceptions**: We provide a strongly-typed `CustomError` base class so you can attach specific application error codes and metadata across your monorepo without resorting to raw strings or plain `Error` objects.

## What You Get

### @fastify/sensible — Full Passthrough

All options from [@fastify/sensible](https://www.npmjs.com/package/@fastify/sensible) are supported. This plugin registers it internally with no configuration, exposing `fastify.httpErrors.*` helpers on the instance.

### Added by This Plugin

- **Global error handler** — catches all thrown errors (HttpErrors, CustomErrors, plain Errors, and non-Error values) and formats them into a consistent `ErrorResponse` JSON shape
- **Safe message masking** — 5xx errors hide implementation details behind generic messages by default; `stackTrace: true` disables masking for development
- **`preErrorHandler` hook** — run custom logic (e.g. SuperTokens, Passport) before the default handler; short-circuits if your handler sends the reply, swallows exceptions otherwise
- **`CustomError` base class** — extend it to create domain errors with a custom `code` field; subclasses are handled safely
- **`stackTrace` decorator** — `fastify.stackTrace` (boolean) reflects the active setting, accessible to other plugins and hooks
- **`ErrorResponse` JSON schema** — registered as `$id: "ErrorResponse"` for use in route response schemas via `$ref: "ErrorResponse#"`
- **Severity-aware logging** — 4xx errors log at `info`, 5xx at `error`; non-Error thrown values are normalized and logged safely

→ [Full feature list](FEATURES.md) · [Developer guide](GUIDE.md)

## Usage Guidelines

### Controllers must not reply with non-200 responses

Do not manually send error responses from route handlers. Always `throw` and let the global error handler format the response.

**Wrong**

```typescript
fastify.get("/test", async (req, reply) => {
  return reply.code(401).send({ message: "Unauthorized" });
});
```

**Correct**

```typescript
fastify.get("/test", async () => {
  throw fastify.httpErrors.unauthorized("Unauthorized");
});
```

### Throw `CustomError` (or a subclass) for domain errors

Modules must throw an instance of `CustomError` (or a class extending it) for application-level errors. This ensures errors are caught consistently and the correct action can be taken.

```typescript
import { CustomError } from "@prefabs.tech/fastify-error-handler";

const file = await fileService.findById(id);
if (!file) {
  throw new CustomError("File not found", "FILE_NOT_FOUND_ERROR");
}
```

## Requirements

**Peer dependencies** (must be installed separately):

- [`fastify`](https://www.npmjs.com/package/fastify) `>=5.2.1`
- [`fastify-plugin`](https://www.npmjs.com/package/fastify-plugin) `>=5.0.1`

Register this plugin **before all routes and other plugins** so the error handler is in place for the entire application.

## Quick Start

```typescript
import errorHandlerPlugin from "@prefabs.tech/fastify-error-handler";
import Fastify from "fastify";

const fastify = Fastify();

await fastify.register(errorHandlerPlugin, {
  stackTrace: process.env.NODE_ENV === "development",
});

// Throw errors in routes — the handler does the rest
fastify.get("/example", async () => {
  throw fastify.httpErrors.notFound("Resource not found");
});

await fastify.listen({ port: 3000, host: "0.0.0.0" });
```

## Installation

Install with npm:

```bash
npm install @prefabs.tech/fastify-error-handler
```

Install with pnpm:

```bash
pnpm add @prefabs.tech/fastify-error-handler
```
