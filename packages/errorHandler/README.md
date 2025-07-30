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

```typescript
import errorHandlerPlugin from "@prefabs.tech/fastify-error-handler";
import Fastify from "fastify";

import config from "./config";

const start = async () => {
  // Create fastify instance
  const fastify = Fastify({
    logger: config.logger,
  });
  
  // Register fastify-error-handler plugin
  await fastify.register(errorHandlerPlugin);
  
  await fastify.listen({
    port: config.port,
    host: "0.0.0.0",
  });
};

start();
```
