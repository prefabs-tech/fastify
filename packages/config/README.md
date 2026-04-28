# @prefabs.tech/fastify-config

> **AI/agents:** Start with this package’s [docs/llm/INDEX.md](docs/llm/INDEX.md) and workspace [docs/llm/REFERENCE.md](../../../docs/llm/REFERENCE.md#config) before reading source.

## AI Quickstart

Package orientation: [docs/llm/INDEX.md](docs/llm/INDEX.md) · Workspace reference: [docs/llm/REFERENCE.md](../../../docs/llm/REFERENCE.md#config)

<!-- docgen:readme:start -->

## Public API (generated)

| Export | Kind | Description |
| --- | --- | --- |
| `ApiConfig` | interface | — |
| `AppConfig` | interface | — |
| `parse` | const | — |

Regenerate with `pnpm docs:generate`.

<!-- docgen:readme:end -->

A [Fastify](https://github.com/fastify/fastify) plugin that provides opinionated, typed configuration management for APIs.

## Why This Plugin?

In a complex API or monorepo with multiple Fastify plugins and services, maintaining a standardized configuration structure is critical. This plugin enforces a consistent config shape across services, centralizes config access at both the instance and request level, and provides a lightweight utility for parsing environment variables — without pulling in heavy validation dependencies like `zod` or `ajv`.

### Why not Zod or @fastify/env?

1. **No runtime validation overhead** — if your infrastructure (CI/CD, Docker, Kubernetes) guarantees correct environment variable injection, strict runtime validation is unnecessary overhead.
2. **Lightweight footprint** — no `ajv` or `zod` means less bundle size and fewer transitive dependencies.
3. **Manual type definitions** — hand-crafted TypeScript interfaces give immediate IDE support across your monorepo without extra build steps.

## What You Get

### Added by This Plugin

- **`fastify.config`** — decorates the Fastify instance with your `ApiConfig` object, accessible everywhere on the instance
- **`request.config`** — decorates every incoming request with the same config reference via an `onRequest` hook (useful for mercurius `buildContext`, route handlers, etc.)
- **`fastify.hostname`** — computed `${baseUrl}:${port}` string, derived from your config
- **`parse(value, fallback)`** — type-coercing env var parser: returns a boolean, number, or string based on the fallback type; returns the fallback when the value is `undefined`
- **`ApiConfig` type** — strongly typed interface covering app identity, origins, logging (pino), pagination, REST feature flag, and multi-tenant app list
- **`AppConfig` type** — per-app shape for multi-tenant configurations (`id`, `name`, `origin`, `supportedRoles`)

→ [Full feature list](FEATURES.md) · [Developer guide](GUIDE.md)

## Requirements

**Peer dependencies** (must be installed separately):

- [`fastify`](https://www.npmjs.com/package/fastify) `>=5.2.1`
- [`fastify-plugin`](https://www.npmjs.com/package/fastify-plugin) `>=5.0.1`

No sibling `@prefabs.tech` plugins need to be registered before this one.

## Quick Start

```typescript
// config.ts
import { parse } from "@prefabs.tech/fastify-config";
import type { ApiConfig } from "@prefabs.tech/fastify-config";

const config: ApiConfig = {
  appName: process.env.APP_NAME as string,
  appOrigin: (process.env.APP_ORIGIN as string).split(","),
  baseUrl: process.env.BASE_URL as string,
  env: parse(process.env.NODE_ENV, "development") as string,
  logger: { level: parse(process.env.LOG_LEVEL, "error") as string },
  name: process.env.NAME as string,
  port: parse(process.env.PORT, 3000) as number,
  protocol: parse(process.env.PROTOCOL, "http") as string,
  rest: { enabled: parse(process.env.REST_ENABLED, true) as boolean },
  version: `${process.env.npm_package_version}+${process.env.BUILD_ID || "local"}`,
};

export default config;
```

```typescript
// server.ts
import configPlugin from "@prefabs.tech/fastify-config";
import Fastify from "fastify";
import config from "./config";

const fastify = Fastify({ logger: config.logger });
await fastify.register(configPlugin, { config });

await fastify.listen({ port: config.port, host: "0.0.0.0" });
```

## Installation

Install with npm:

```bash
npm install @prefabs.tech/fastify-config
```

Install with pnpm:

```bash
pnpm add @prefabs.tech/fastify-config
```
