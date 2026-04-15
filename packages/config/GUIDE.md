# @prefabs.tech/fastify-config — Developer Guide

## Installation

### For package consumers

```bash
npm install @prefabs.tech/fastify-config
```

```bash
pnpm add @prefabs.tech/fastify-config
```

### For monorepo development

```bash
pnpm install
pnpm --filter @prefabs.tech/fastify-config test
pnpm --filter @prefabs.tech/fastify-config build
```

## Setup

Register the plugin once at startup, passing your config object. All subsequent examples assume this setup.

```typescript
import Fastify from "fastify";
import configPlugin, { type ApiConfig } from "@prefabs.tech/fastify-config";

const config: ApiConfig = {
  appName: "my-api",
  appOrigin: ["https://app.example.com"],
  baseUrl: "http://localhost",
  env: "production",
  logger: { level: "info" },
  name: "my-api",
  port: 3000,
  protocol: "https",
  rest: { enabled: true },
  version: "1.0.0",
};

const fastify = Fastify();
await fastify.register(configPlugin, { config });
```

---

## Base Libraries

### `fastify-plugin` — Modified

`fastify-plugin` provides Fastify plugin wrapping and metadata controls.

-> **Their docs:** [`fastify-plugin`](https://www.npmjs.com/package/fastify-plugin)

We wrap this library with a different surface:

- Consumers do not pass `fastify-plugin` metadata options (`name`, `dependencies`, Fastify version metadata, etc.).
- The exposed API is only `fastify.register(configPlugin, { config })`.
- Internally we use the wrapper to expose our decorators and hooks application-wide.

**What we add on top:**

- `fastify.config` decorator with your `ApiConfig` object
- `fastify.hostname` decorator derived from `baseUrl` and `port`
- `request.config` population via `onRequest`
- Type exports and Fastify module augmentation
- `parse` utility for typed env parsing

---

## Features

### Plugin registration contract

The plugin takes one required option (`config`) and does not apply internal defaults. Pass a full `ApiConfig` object at registration time.

```typescript
await fastify.register(configPlugin, {
  config: {
    appName: "my-api",
    appOrigin: ["https://app.example.com"],
    baseUrl: "http://localhost",
    env: "production",
    logger: { level: "info" },
    name: "my-api",
    port: 3000,
    protocol: "https",
    rest: { enabled: true },
    version: "1.0.0",
  },
});
```

### `fastify.config` decorator

After registration, the full `ApiConfig` object is available on every `FastifyInstance`:

```typescript
fastify.get("/status", async () => {
  return { env: fastify.config.env, version: fastify.config.version };
});
```

### `fastify.hostname` decorator

A computed `hostname` string (`${config.baseUrl}:${config.port}`) is available on `FastifyInstance`:

```typescript
fastify.get("/info", async () => {
  return { url: fastify.hostname };
  // → "http://localhost:3000"
});
```

### `request.config` on every request

An `onRequest` hook makes `config` available on every `FastifyRequest`, so route handlers can access it without importing globals:

```typescript
fastify.get("/me", async (request) => {
  return { origin: request.config.appOrigin };
});
```

### `parse` — typed env var parser

The exported `parse` utility converts raw environment variables to their intended types. Pass a fallback value; its type determines how the string is coerced.

```typescript
import { parse } from "@prefabs.tech/fastify-config";

const config: ApiConfig = {
  port: parse(process.env.PORT, 3000) as number,
  env: parse(process.env.NODE_ENV, "development") as string,
  // ...
};
```

Rules:

- `value === undefined` → returns `fallback`
- `typeof fallback === "boolean"` → `!!JSON.parse(value)` (`"true"`/`"1"` → `true`, `"false"`/`"0"` → `false`)
- `typeof fallback === "number"` → `JSON.parse(value)`
- Otherwise → returns `value` as-is (string)
- Invalid JSON-like input in boolean/number mode propagates `SyntaxError` from `JSON.parse`.

### `ApiConfig` type

The full application config shape. Top-level fields:

| Field        | Type                           | Description                           |
| ------------ | ------------------------------ | ------------------------------------- |
| `appName`    | `string`                       | Application name                      |
| `appOrigin`  | `string[]`                     | Allowed origins                       |
| `apps`       | `AppConfig[]`                  | Optional sub-app list                 |
| `baseUrl`    | `string`                       | Base URL (used to compute `hostname`) |
| `env`        | `string`                       | Deployment environment                |
| `logger`     | object                         | Logger configuration (see below)      |
| `name`       | `string`                       | Service name                          |
| `pagination` | `{ default_limit, max_limit }` | Optional pagination defaults          |
| `port`       | `number`                       | Port (used to compute `hostname`)     |
| `protocol`   | `string`                       | Transport protocol                    |
| `rest`       | `{ enabled: boolean }`         | REST transport toggle                 |
| `version`    | `string`                       | Application version                   |

#### `logger` sub-object

| Field         | Type                                   | Notes                                                                                                |
| ------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `level`       | `Level`                                | Required pino log level                                                                              |
| `base`        | `LoggerOptions["base"]`                | Pino base fields                                                                                     |
| `formatters`  | `LoggerOptions["formatters"]`          | Pino log formatters                                                                                  |
| `prettyPrint` | object                                 | Pretty-print options (`colorize`, `ignore`, `translateTime`)                                         |
| `rotation`    | object                                 | Log rotation (`enabled`, `filenames`, `path`, `interval`, `size`, `maxFiles`, `maxSize`, `compress`) |
| `streams`     | `(DestinationStream \| StreamEntry)[]` | Pino stream list                                                                                     |
| `timestamp`   | `LoggerOptions["timestamp"]`           | Pino timestamp                                                                                       |
| `transport`   | `LoggerOptions["transport"]`           | Pino transport                                                                                       |

### `AppConfig` type

Shape of each entry in `ApiConfig.apps`:

```typescript
interface AppConfig {
  id: number;
  name: string;
  origin: string;
  supportedRoles: string[];
}
```

### TypeScript module augmentation

The plugin ships with module augmentation for Fastify's types. No extra setup is needed — `fastify.config`, `fastify.hostname`, and `request.config` are typed automatically after importing from this package.

---

## Use Cases

### Building config from environment variables

Use `parse` to construct a fully typed `ApiConfig` from `process.env`:

```typescript
import { parse } from "@prefabs.tech/fastify-config";
import type { ApiConfig } from "@prefabs.tech/fastify-config";

const config: ApiConfig = {
  appName: parse(process.env.APP_NAME, "my-api") as string,
  appOrigin: (process.env.APP_ORIGIN ?? "http://localhost:3000").split(","),
  baseUrl: parse(process.env.BASE_URL, "http://localhost") as string,
  env: parse(process.env.NODE_ENV, "development") as string,
  logger: {
    level: parse(process.env.LOG_LEVEL, "info") as string as Level,
  },
  name: "my-api",
  port: parse(process.env.PORT, 3000) as number,
  protocol: parse(process.env.PROTOCOL, "http") as string,
  rest: { enabled: parse(process.env.REST_ENABLED, true) as boolean },
  version: parse(process.env.APP_VERSION, "0.0.0") as string,
};
```

### Accessing config in a route handler

Config is available on both the instance and the request object, so you can use whichever is in scope:

```typescript
// Via instance (useful in plugin scope)
fastify.get("/version", async () => ({ version: fastify.config.version }));

// Via request (useful in route handlers without fastify in closure)
fastify.get("/origin", async (request) => ({
  origin: request.config.appOrigin,
}));
```

### Multi-app origin checking

`ApiConfig.apps` lets you describe multiple sub-applications with their own origins and roles:

```typescript
const config: ApiConfig = {
  // ...base config...
  apps: [
    {
      id: 1,
      name: "dashboard",
      origin: "https://dash.example.com",
      supportedRoles: ["admin"],
    },
    {
      id: 2,
      name: "portal",
      origin: "https://portal.example.com",
      supportedRoles: ["user", "admin"],
    },
  ],
};

fastify.addHook("onRequest", async (request) => {
  const origin = request.headers.origin ?? "";
  const app = request.config.apps?.find((a) => a.origin === origin);
  if (!app) throw fastify.httpErrors.forbidden("Unknown origin");
});
```
