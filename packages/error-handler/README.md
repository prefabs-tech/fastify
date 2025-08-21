# @prefabs.tech/fastify-error-handler

A [Fastify](https://github.com/fastify/fastify) plugin that provides an easy integration of error handler in fastify API.

## Requirements

* [@prefabs.tech/fastify-config](../config/)
* [@fastify/sensible](https://github.com/fastify/fastify-sensible)

## Installation

Install with npm:

```bash
npm install @prefabs.tech/fastify-error-handler
```

Install with pnpm:

```bash
pnpm add --filter "@scope/project @prefabs.tech/fastify-error-handler
```

## Usage

### Register Plugin

Register @prefabs.tech/fastify-error-handler package with your Fastify instance:

Note: Register the errorHandler plugin as early as possible (Before all your routes and plugin registration).

```typescript
import errorHandlerPlugin from "@prefabs.tech/fastify-error-handler";
import Fastify from "fastify";

const start = async () => {
  // Create fastify instance
  const fastify = Fastify();
  
  // Register fastify-error-handler plugin
  await fastify.register(errorHandlerPlugin, {});
  
  await fastify.listen({
    port: config.port,
    host: "0.0.0.0",
  });
};

start();
```
### Options

#### stackTrace

When enabled, the error handler will include the error’s stack trace in the HTTP response body.

By default, it is set to false.

```ts
stackTrace?: boolean; // Default: false
```

#### preErrorHandler

preErrorHandler is an optional error handler that runs before the default error handler logic.
It allows you to intercept specific errors, handle them yourself, and prevent the default handler from running.

This is especially useful when you need to integrate with other libraries that have their own error formats — for example, handling SuperTokens errors before your API’s standard error response.

```ts
preErrorHandler?: (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) => void | Promise<void>;
```

## Error Handling Guidelines

### Controllers must not reply with non-200 responses

Do not manually send error responses from controllers.

Instead, always throw an error and let the global error handler handle formatting and response.

**Wrong**

```ts
fastify.get('/test', async (req, reply) => {
  return reply.code(401).send({ message: "Unauthorized" });
})
```

**Correct**

```ts
fastify.get('/test', async (req, reply) => {
  throw fastify.httpErrors.unauthorized("Unauthorized");
})
```

### Throw `CustomError` (or subclass)
- Modules **must throw** an instance of `CustomError` (or a class extending it).
- This ensures errors can be consistently caught and appropriate actions taken.

```ts
import { CustomError } from "@prefabs.tech/fastify-error-handler";

const file = fileService.findById(1);

if (!file) {
  throw new CustomError("File not found", "FILE_NOT_FOUND_ERROR");
}
```
