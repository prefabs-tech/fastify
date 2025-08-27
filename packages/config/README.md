# @prefabs.tech/fastify-config

A [Fastify](https://github.com/fastify/fastify) plugin that defines an opinionated config for an API.

When registered on a Fastify instance, the plugin will:

* decorate the Fastify instance with the `config` object, available with the `config` attribute.
* decorate all requests with the `config` object, available with the `config` attribute; this can be used to construct a `buildContext` for mercurius resolvers, for example.
* decorate the Fastify instance with a `hostname` attribute.

## Installation

Install with npm:

```bash
npm install @prefabs.tech/fastify-config
```

Install with pnpm:

```bash
pnpm add --filter "@scope/project @prefabs.tech/fastify-config
```

## Usage

Somewhere in your code, create a `config.ts` file that looks like this:

```typescript
import { parse } from "@prefabs.tech/fastify-config";
import dotenv from "dotenv";

import type { ApiConfig } from "@prefabs.tech/fastify-config";

dotenv.config();

const config: ApiConfig = {
  appName: process.env.APP_NAME as string,
  appOrigin: (process.env.APP_ORIGIN as string).split(","),
  baseUrl: process.env.BASE_URL as string,
  env: parse(process.env.NODE_ENV, "development") as string,
  logger: {
    level: parse(process.env.LOG_LEVEL, "error") as string,
  },
  name: process.env.NAME as string,
  pagination: {
    default_limit: parse(process.env.PAGINATION_DEFAULT_LIMIT, 25) as number,
    max_limit: parse(process.env.PAGINATION_MAX_LIMIT, 50) as number,
  },
  port: parse(process.env.PORT, 20040) as number,
  protocol: parse(process.env.PROTOCOL, "http") as string,
  rest: {
    enabled: parse(process.env.REST_ENABLED, true) as boolean,
  },
  version: `${process.env.npm_package_version || process.env.API_VERSION}+${process.env.API_BUILD || "local"}` as string,
};

export default config;
```

Register the plugin with your Fastify instance:

```typescript
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

  await fastify.listen({
    port: config.port,
    host: "0.0.0.0",
  });
};

start();
```
