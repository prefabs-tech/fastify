# 00 — Overview

## 1. Scope and compatibility

Ten packages, published from one monorepo, versioned in lockstep at the root
`package.json` version. At the time of writing that version is **0.94.1**.

| Requirement | Value |
|---|---|
| Node | `>= 20` (`engines.node` in every package) |
| Fastify | `>= 5.10.0` |
| `fastify-plugin` | `>= 5.1.0` |
| Module format | Dual ESM + CJS. `"type": "module"`; `main` → `.cjs`, `module` → `.js`, `types` → `dist/types/index.d.ts` |
| Published files | `dist` only |

Sibling packages are pinned to the **exact** lockstep version in both
`peerDependencies` and `devDependencies`. A consuming application must
therefore install every `@prefabs.tech/fastify-*` package it uses at the same
version — a mixed-version install fails strict peer resolution.

## 2. The packages

| Package | Purpose | Sibling peers |
|---|---|---|
| `@prefabs.tech/fastify-config` | Application configuration object, decorated onto the instance and every request | — |
| `@prefabs.tech/fastify-error-handler` | Uniform error responses, `httpErrors`, the `ErrorResponse` schema | — |
| `@prefabs.tech/fastify-swagger` | `@fastify/swagger` + `@fastify/swagger-ui` behind one option object | — |
| `@prefabs.tech/fastify-slonik` | Postgres pool, interceptors, service/SQL-factory base classes | config |
| `@prefabs.tech/fastify-mailer` | Nodemailer transport with MJML templating | config |
| `@prefabs.tech/fastify-graphql` | Mercurius, shared context, base SDL, upload transport | config, slonik |
| `@prefabs.tech/fastify-s3` | S3 client, file records, multipart intake | config, error-handler, graphql, slonik |
| `@prefabs.tech/fastify-firebase` | Firebase Admin, device registry, push notifications | config, error-handler, graphql, slonik |
| `@prefabs.tech/fastify-user` | SuperTokens auth, users, roles, permissions, invitations | config, error-handler, graphql, mailer, s3, slonik |
| `@prefabs.tech/fastify-phone-auth` | Passwordless phone login via SuperTokens + Twilio Verify | config, error-handler, slonik, user |

### Dependency graph

```
config ── slonik ── graphql ─┬─ s3 ──── user ── phone-auth
   │         │               │          │
   │         └───────────────┴─ firebase│
   ├── mailer ───────────────────────────┘
error-handler ─────────────────────────────┘
swagger (independent)
```

`user` is the heaviest consumer. Its edge to `s3` exists for profile photos and
for a foreign key in its own migration; a draft spec proposes removing it (see
`docs/specs/user-photo-storage.md`).

## 3. Installation

Peer dependencies are **not** installed implicitly. Install each package
together with the peers it declares.

```bash
# minimal: config + errors
npm install @prefabs.tech/fastify-config @prefabs.tech/fastify-error-handler \
            fastify fastify-plugin

# adding the database layer
npm install @prefabs.tech/fastify-slonik slonik zod

# adding GraphQL
npm install @prefabs.tech/fastify-graphql graphql mercurius

# adding auth
npm install @prefabs.tech/fastify-user @prefabs.tech/fastify-mailer \
            @prefabs.tech/fastify-s3 supertokens-node mercurius-auth \
            @fastify/cors @fastify/formbody mjml
```

```bash
pnpm add @prefabs.tech/fastify-config @prefabs.tech/fastify-error-handler fastify fastify-plugin
```

## 4. Registration order

Every plugin is wrapped in `fastify-plugin`, so what it decorates, hooks, and
parses lands on the **root** instance. Later plugins read those decorators
**while they register**, not lazily per request. A missing predecessor produces
a boot-time throw, a `TypeError` on an undefined decorator, or — in the upload
case — silent misbehaviour at request time.

| # | Plugin | Provides | Requires first |
|---|--------|----------|----------------|
| 1 | config | `fastify.config`, `request.config`, `fastify.hostname` | — |
| 2 | error-handler | `fastify.httpErrors`, `ErrorResponse` schema, root error handler | — |
| 3 | slonik | verified pool, `citext`/`unaccent`, `fastify.slonik`, `request.slonik`, `request.dbSchema` | config (only on the deprecated no-options path) |
| 4 | graphql | upload transport parser, then mercurius (`fastify.graphql`) | config and slonik request decorators (read per request) |
| 5 | s3 | `files` table; `@fastify/multipart` when `rest.enabled` | `fastify.slonik` — throws if absent |
| 6 | recipe plugins (phone-auth) | a SuperTokens recipe factory on `fastify.supertokensRecipes` | must precede user |
| 7 | user | `supertokens.init()`, `verifySession`, `hasPermission`, `users`/`invitations` tables, routes, GraphQL auth directives | config.user, slonik, the `files` table, graphql (if enabled), `httpErrors` |
| 8 | firebase | `user_devices` table, routes | `verifySession`, `httpErrors`, slonik |

`swagger` and `mailer` have no ordering relationship with their siblings, other
than `user`'s peer dependency on `mailer` for sending invitation and password
emails.

### Why each constraint holds

**slonik before anything that migrates.** s3, user, and firebase run DDL
through `fastify.slonik` during registration. Only s3 checks explicitly,
throwing `Missing slonik decorator. Did you forget to register the slonik
plugin before the s3 plugin?`; the others fail on an undefined property. The
slonik plugin also opens a connection at registration and rethrows if Postgres
is unreachable, so a bad DSN stops boot at this step.

**s3 before user.** `CREATE TABLE users` declares
`FOREIGN KEY (photo_id) REFERENCES <files table>`, resolving the files table
name from `config.s3.table.name` with s3's `TABLE_FILES` as fallback. The user
migration runs while the user plugin registers, so the files table must already
exist. A deployment that never uses photos still cannot start without it.

**graphql before s3**, when both REST multipart and GraphQL uploads are used.
`@fastify/multipart` registers a dedicated `multipart/form-data` parser.
Content-type parsers are snapshotted into an encapsulation context when that
context is created, so a parser registered before mercurius is captured by the
GraphQL route's context and consumes upload bodies. The same reasoning applies
inside the graphql plugin, which registers its upload transport before
mercurius deliberately.

**graphql before user**, when GraphQL is enabled. The user plugin registers its
`mercurius-auth` plugins only when `fastify.config.graphql.enabled` is truthy,
and `mercurius-auth` attaches to an existing mercurius instance.

**Recipe plugins before user.** SuperTokens allows exactly one global `init()`,
and it runs while user registers. `addSupertokensRecipe` throws once the
`supertokensInitialized` decorator exists.

**user before firebase.** Firebase controllers call `fastify.verifySession()`
at *route registration* time to build their preHandlers, and `user` is what
decorates `verifySession`.

### Work deferred to `onReady`

- user seeds `ADMIN`, `SUPERADMIN`, `USER` and any configured roles — this
  needs the SuperTokens core to be reachable.
- phone-auth adds `users.phone_number` and extends the GraphQL `User` type. It
  must register *before* user, but the users table only exists *after* user
  registers, so `onReady` is the only safe point.

### Two root error handlers

Both error-handler and user's SuperTokens sub-plugin call `setErrorHandler` on
the root context. Which one wins depends on registration order and on
`config.user.supertokens.setErrorHandler`. The supported wiring is to disable
the SuperTokens auto-registration and hand its handler to error-handler:

```typescript
await fastify.register(errorHandlerPlugin, {
  preErrorHandler: supertokensErrorHandler,
  stackTrace: config.env !== "production",
});
// ...
// config.user.supertokens.setErrorHandler = false
```

## 5. Cross-cutting conventions

### 5.1 Plugin options versus `fastify.config`

The packages are mid-migration from *reading* their namespace off
`fastify.config` to *receiving* options at `register()`. Both paths work at
0.94; the config path is deprecated and warns.

| Package | Accepts options | Fallback when options are empty | Config-only |
|---|---|---|---|
| config | `{ config }` — it is the source | n/a | n/a |
| error-handler | yes | none | no |
| swagger | yes | none | no |
| slonik, `migrationPlugin` | yes | `fastify.config.slonik` (warns) | no |
| graphql | yes | `fastify.config.graphql` (warns) | no |
| mailer | yes | `fastify.config.mailer` (warns) | no |
| s3 | `Partial<S3Options>` | `{ ...config.s3, rest: config.rest }` (warns) | partly — see below |
| firebase | no | n/a | **yes** |
| user | no | n/a | **yes** |
| phone-auth | no | n/a | **yes** |

Every migrated plugin detects the fallback with
`Object.keys(options).length === 0`. Consequences that surprise people:

- Options and config are **never merged**. Passing any key at all disables the
  fallback entirely — a partial options object does not inherit the rest from
  `fastify.config`.
- `register(plugin)` and `register(plugin, {})` behave identically.
- When the namespace is missing too, the plugin throws
  `Missing <x> configuration. Did you forget to pass it to the <x> plugin?`.

**s3 is only half-migrated.** Its *plugin* runs on options alone, but the code
it exports does not: `FileService` builds its client from
`this.config.s3.clientConfig` and reads `this.config.s3.filenameResolutionStrategy`,
and `FileSqlFactory` reads `this.config.s3?.table?.name`. Any application that
uses `FileService` — including indirectly, through the user package's photo
features — must still carry an `s3` block on the config object handed to
services.

### 5.2 Feature flags default ON

The house convention is that an absent flag means enabled. The only disable
check is `=== false`:

```typescript
if (config.firebase.enabled === false) { /* skipped */ }
```

`undefined` means enabled. Two places deviate, and both are deliberate:

- **`config.graphql.enabled`** must be **truthy**. The graphql plugin tests
  `if (options?.enabled)`, so an omitted flag leaves mercurius unregistered.
- **`config.firebase.appCheck.enabled`** is opt-**in** for the same reason —
  `verifyFirebaseAppCheck` returns early unless the flag is truthy.

### 5.3 Route disabling and handler overrides

Packages that ship routes expose two independent switches:

```typescript
config.user.routes.invitations.disabled = true;      // skip the whole group
config.user.handlers.user.me = myCustomMeHandler;    // replace one handler
```

Route groups are registered under `config.<pkg>.routePrefix`. Handler override
slots follow the pattern `handlersConfig?.x || handlers.x` at the controller.
Not every route has a slot — see
[the REST reference](11-rest-api-reference.md) for which do.

### 5.4 The case boundary

TypeScript is camelCase; PostgreSQL is snake_case. Conversion happens in
exactly two places: `DefaultSqlFactory` (via `humps.decamelize` on column names
in generated queries) and the `fieldNameCaseConverter` slonik interceptor
(via `humps.camelizeKeys` on every result row).

Consequences for anyone writing SQL by hand:

```typescript
// hand-written fragments use snake_case column names
sql.fragment`device_token = ${token}`;
// TypeScript object keys stay camelCase
service.create({ deviceToken, userId });
```

### 5.5 Errors

Domain errors carry a code and are thrown from the service layer:

```typescript
throw new CustomError("File already exists in S3.", ERROR_CODES.FILE_ALREADY_EXISTS_IN_S3);
```

HTTP errors are thrown from handlers, using the decorator `@fastify/sensible`
installs:

```typescript
throw request.server.httpErrors.unauthorized("Unauthorised");
```

Route schemas reference the shared error shape by `$ref`:

```typescript
response: { 401: { $ref: "ErrorResponse#", description: "Unauthorized" } }
```

That schema is registered by the error-handler plugin. A route schema using the
`$ref` without that plugin registered fails at boot.

### 5.6 SQL safety

Every query is a slonik tagged template — `sql.type(...)` or `sql.fragment`.
Identifiers go through `sql.identifier([...])`. String concatenation into SQL
appears nowhere in these packages and is not supported by the base classes.

## 6. A complete registration

```typescript
import Fastify from "fastify";
import cors from "@fastify/cors";
import formbody from "@fastify/formbody";

import configPlugin, { type ApiConfig } from "@prefabs.tech/fastify-config";
import errorHandlerPlugin from "@prefabs.tech/fastify-error-handler";
import slonikPlugin from "@prefabs.tech/fastify-slonik";
import graphqlPlugin from "@prefabs.tech/fastify-graphql";
import s3Plugin from "@prefabs.tech/fastify-s3";
import phoneAuthPlugin from "@prefabs.tech/fastify-phone-auth";
import userPlugin, {
  SUPERTOKENS_CORS_HEADERS,
  supertokensErrorHandler,
} from "@prefabs.tech/fastify-user";
import firebasePlugin from "@prefabs.tech/fastify-firebase";
import swaggerPlugin from "@prefabs.tech/fastify-swagger";
import mailerPlugin from "@prefabs.tech/fastify-mailer";

const config: ApiConfig = { /* see chapter 01 */ };

const api = Fastify({ logger: config.logger });

await api.register(configPlugin, { config });
await api.register(cors, {
  allowedHeaders: ["content-type", ...SUPERTOKENS_CORS_HEADERS],
  credentials: true,
  origin: config.appOrigin,
});
await api.register(formbody);
await api.register(errorHandlerPlugin, {
  preErrorHandler: supertokensErrorHandler,
  stackTrace: config.env !== "production",
});
await api.register(swaggerPlugin, { fastifySwaggerOptions: { openapi: {} } });
await api.register(slonikPlugin, config.slonik);
await api.register(mailerPlugin, config.mailer);
await api.register(graphqlPlugin, config.graphql);
await api.register(s3Plugin, { ...config.s3, rest: config.rest });
await api.register(phoneAuthPlugin);   // before user — contributes a recipe
await api.register(userPlugin);        // reads fastify.config.user
await api.register(firebasePlugin);    // reads fastify.config.firebase

await api.listen({ port: config.port });
```

Note the mixture: slonik, mailer, graphql, and s3 take options directly;
phone-auth, user, and firebase still read `fastify.config`. Both styles must
coexist until the migration completes, which is why the config object still
carries every namespace.
