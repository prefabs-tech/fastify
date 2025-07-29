# @prefabs.tech/fastify-error-handler

A [Fastify](https://github.com/fastify/fastify) plugin that defines an opinionated config for an API.

When registered on a Fastify instance, the plugin will:

* decorate the Fastify instance with the `errorHandler` object, available with the `errorHandler` attribute.
* decorate all requests with the `errorHandler` object, available with the `errorHandler` attribute; this can be used to construct a `buildContext` for mercurius resolvers, for example.
* decorate the Fastify instance with a `hostname` attribute.

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

import configPlugin from "@prefabs.tech/fastify-error-handler";
import Fastify from "fastify";

import config from "./config";

const start = async () => {
  // Create fastify instance
  const fastify = Fastify({
    logger: config.logger,
  });

  // Register fastify-error-handler plugin
  await fastify.register(configPlugin, { config });

  await fastify.listen({
    port: config.port,
    host: "0.0.0.0",
  });
};

start();
```
