# 01 — `@prefabs.tech/fastify-config`

The configuration carrier. It holds no logic and validates nothing: it takes
the object you give it and makes it reachable from the instance and from every
request, with types.

Peers: `fastify >= 5.10.0`, `fastify-plugin >= 5.1.0`. No sibling peers.

## Registration

One required option, `config`. There are no internal defaults — pass a complete
object.

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

const fastify = Fastify({ logger: config.logger });
await fastify.register(configPlugin, { config });
```

## What it adds

| Surface | Value |
|---|---|
| `fastify.config` | the `ApiConfig` object, by reference |
| `fastify.hostname` | `` `${config.baseUrl}:${config.port}` `` |
| `request.config` | the same object, assigned in an `onRequest` hook |

```typescript
fastify.get("/status", async (request) => ({
  env: request.config.env,
  host: fastify.hostname,   // "http://localhost:3000"
}));
```

Because the object is shared by reference, mutating `fastify.config` at runtime
is visible everywhere immediately — including to services that captured it.
Treat it as immutable after boot.

## `ApiConfig`

| Field | Type | Notes |
|---|---|---|
| `appName` | `string` | Also the SuperTokens `appInfo.appName`, and the fallback domain for phone-auth synthetic emails |
| `appOrigin` | `string[]` | `appOrigin[0]` becomes the SuperTokens `websiteDomain` |
| `apps` | `AppConfig[]` | Optional multi-app descriptors |
| `baseUrl` | `string` | Also the SuperTokens `apiDomain` |
| `env` | `string` | Deployment environment |
| `logger` | object | Pino options — see below |
| `name` | `string` | Service name |
| `pagination` | `{ default_limit: number; max_limit: number }` | **Not read by any package** — see the gotcha below |
| `port` | `number` | |
| `protocol` | `string` | |
| `rest` | `{ enabled: boolean }` | Read by s3 (on the config-fallback path) to decide multipart registration |
| `version` | `string` | |

`logger` accepts `level` (required, a pino `Level`) plus optional `base`,
`formatters`, `prettyPrint.options` (`colorize`, `ignore`, `translateTime`),
`rotation` (`enabled` and `options`: `filenames`, `path`, `interval`, `size`,
`maxFiles`, `maxSize`, `compress`), `streams`, `timestamp`, and `transport`.
These pass through to pino unchanged; see the
[pino options](https://getpino.io/#/docs/api?id=options) documentation.

```typescript
interface AppConfig {
  id: number;
  name: string;
  origin: string;
  supportedRoles: string[];
}
```

### Gotcha: two pagination keys

`ApiConfig.pagination` uses `default_limit` / `max_limit`, and **nothing reads
it**. The pagination that actually governs list queries lives under the slonik
namespace with different casing:

```typescript
config.slonik.pagination = { defaultLimit: 20, maxLimit: 50 };
```

`DefaultSqlFactory` reads `config.slonik.pagination.defaultLimit` and
`.maxLimit`. Setting `config.pagination` has no effect.

## Module augmentation

Each package extends `ApiConfig` from its own `index.ts` with its namespace, so
importing a package makes `fastify.config.<pkg>` typed. Namespaces contributed
at 0.94: `slonik`, `graphql`, `mailer`, `s3` (deprecated), `firebase`, `user`,
`phoneAuth`.

This means the *type* of `ApiConfig` depends on which packages your application
imports. A config object typed against the full set will report missing
required namespaces if you drop a package — `user` and `graphql`, for example,
declare their namespaces as required, not optional.

## Composing the object

The package imposes no shape on how you build the object. A common pattern is
one module per namespace, merged at the end:

```typescript
// config/index.ts
import base from "./base";
import slonik from "./slonik";
import user from "./user";

export default { ...base, slonik, user } satisfies ApiConfig;
```

A future direction — `packages/config/ADR-CONFIG.md` (Proposed) and
`SPEC-APICONFIG.md` (Draft) — removes the per-package augmentations and has the
application compose its own `AppConfig extends ApiConfig`, with zod validation
at startup. Neither is implemented at 0.94; no validation exists in this
package today.
