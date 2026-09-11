---
type: Architecture
title: Plugin Registration Order
description: The order a consuming app must register the prefabs plugins in, and the concrete coupling that makes each ordering constraint hold.
tags: [fastify, plugins, ordering, boot, supertokens, migrations]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: config-plugin
    resource: repo://packages/config/src/plugin.ts#L7-L24
    title: Config plugin decorates config and hostname
  - id: slonik-plugin
    resource: repo://packages/slonik/src/plugin.ts#L12-L42
    title: Slonik plugin registration
  - id: slonik-connect
    resource: repo://packages/slonik/src/slonik.ts#L17-L49
    title: Slonik connection check and decorators
  - id: graphql-plugin
    resource: repo://packages/graphql/src/plugin.ts#L12-L52
    title: GraphQL plugin registers upload transport before mercurius
  - id: s3-plugin
    resource: repo://packages/s3/src/plugin.ts#L13-L62
    title: S3 plugin requires slonik and runs files migration
  - id: user-plugin
    resource: repo://packages/user/src/plugin.ts#L18-L60
    title: User plugin registration sequence
  - id: st-plugin
    resource: repo://packages/user/src/supertokens/plugin.ts#L10-L25
    title: SuperTokens plugin (init, error handler, verifySession)
  - id: recipe-registry
    resource: repo://packages/user/src/supertokens/recipeRegistry.ts#L5-L24
    title: addSupertokensRecipe guard
  - id: user-queries
    resource: repo://packages/user/src/migrations/queries.ts#L55-L74
    title: users table references the s3 files table
  - id: phone-auth-plugin
    resource: repo://packages/phone-auth/src/plugin.ts#L10-L29
    title: Phone auth defers its migration to onReady
  - id: firebase-plugin
    resource: repo://packages/firebase/src/plugin.ts#L10-L32
    title: Firebase plugin registration
  - id: firebase-controller
    resource: repo://packages/firebase/src/model/userDevice/controller.ts#L11-L31
    title: Firebase routes call verifySession at registration
  - id: error-handler-plugin
    resource: repo://packages/error-handler/src/plugin.ts#L41-L70
    title: Error-handler plugin installs root error handler
  - id: graphql-guide-gotchas
    resource: repo://packages/graphql/GUIDE.md#L436-L447
    title: GraphQL upload gotchas, s3 ordering
  - id: user-guide-setup
    resource: repo://packages/user/GUIDE.md#L23-L66
    title: User package setup example
  - id: user-guide-error-handler
    resource: repo://packages/user/GUIDE.md#L187-L204
    title: User package SuperTokens error handler options
  - id: photo-storage-spec
    resource: repo://docs/specs/user-photo-storage.md
    title: Pluggable photo storage spec (draft), section 1
  - id: phone-auth-test
    resource: repo://packages/phone-auth/src/__test__/plugin.test.ts#L73-L99
    title: Phone auth ordering tests
---

# Plugin Registration Order

Every plugin in this repository is wrapped in `fastify-plugin`, so what it decorates, hooks, and parses lands on the **root** instance. Later plugins read those decorators **while they register**, not lazily per request. When a predecessor is missing, you get a boot-time throw, a `TypeError` on an undefined decorator, or, in the upload case, a silent misbehaviour at request time.

This page lists the order the code requires and the coupling behind each rule. See [Fastify encapsulation in this repo](../reference/fastify-encapsulation.md) for the underlying mechanics.

## The sequence

| # | Plugin | What it gives later plugins | What it needs first |
|---|--------|-----------------------------|---------------------|
| 1 | [config](../components/config.md) | `fastify.config`, `request.config` (onRequest hook), `fastify.hostname`[^config-plugin] | nothing |
| 2 | [error-handler](../components/error-handler.md) | `@fastify/sensible` (`fastify.httpErrors`), the `ErrorResponse` schema, a root error handler[^error-handler-plugin] | nothing |
| 3 | [slonik](../components/slonik.md) | A verified pool; `citext`/`unaccent` extensions; `fastify.slonik`, `request.slonik`, `request.dbSchema`[^slonik-plugin][^slonik-connect] | config (only on the deprecated no-options path) |
| 4 | [graphql](../components/graphql.md) (if used) | The upload transport's `*` parser, then mercurius (`fastify.graphql`)[^graphql-plugin] | config/slonik request decorators, read at request time |
| 5 | [s3](../components/s3.md) | The `files` table; `@fastify/multipart` when `rest.enabled`[^s3-plugin] | `fastify.slonik`; throws if absent |
| 6 | Recipe plugins, e.g. [phone-auth](../components/phone-auth.md) | A SuperTokens recipe factory pushed onto `fastify.supertokensRecipes`[^phone-auth-plugin] | must come **before** user |
| 7 | [user](../components/user.md) | `supertokens.init()`, `verifySession`, `hasPermission`, the `users`/`invitations` tables, routes, GraphQL auth directives[^user-plugin][^st-plugin] | config.user, slonik, the `files` table, graphql (if enabled), httpErrors |
| 8 | [firebase](../components/firebase.md) | The `user_devices` table, routes[^firebase-plugin] | `verifySession`, `httpErrors`, slonik |

[swagger](../components/swagger.md) and [mailer](../components/mailer.md) have no ordering relationship with siblings visible in the code, apart from user's peer dependency on mailer.

## Each constraint and why it holds

### slonik before anything that migrates
s3, user, and firebase run DDL through `fastify.slonik` **during registration**. phone-auth runs its DDL in `onReady`.[^s3-plugin][^user-plugin][^firebase-plugin] Only s3 checks explicitly, throwing `Missing slonik decorator. Did you forget to register the slonik plugin before the s3 plugin?`. The others fail on an undefined property.

The slonik plugin also opens a connection at registration and rethrows if Postgres is unreachable, so a bad DSN stops boot at this step.[^slonik-connect]

### s3 before user
`CREATE TABLE users` declares `FOREIGN KEY (photo_id) REFERENCES <files table>`. The files table name comes from `config.s3.table.name`, falling back to s3's `TABLE_FILES`.[^user-queries] The user migration runs while the user plugin registers, so the files table must already exist. The draft photo-storage spec names this an implicit registration-order dependency with no off-switch.[^photo-storage-spec]

> Inference: the user GUIDE setup example does not show s3 at all.[^user-guide-setup] The order above comes from the foreign key, not from any documented sequence.

### graphql before s3, when both REST multipart and GraphQL uploads are used
`@fastify/multipart` registers a dedicated `multipart/form-data` parser. If it is registered before mercurius, that parser is snapshotted into the GraphQL route's context and consumes GraphQL upload bodies.[^graphql-guide-gotchas] Inside the graphql plugin, the upload transport is registered before mercurius for the same snapshot reason.[^graphql-plugin] See [GraphQL uploads return 415 or an empty body](../troubleshooting/graphql-uploads-415-or-empty-body.md).

### graphql before user, when GraphQL is enabled
The user plugin registers its mercurius-auth plugins only when `fastify.config.graphql.enabled` is truthy.[^user-plugin] mercurius-auth attaches to an existing mercurius instance, so graphql has to come first. The user GUIDE states the same requirement for its GraphQL integration.

### Recipe plugins before user
SuperTokens allows one global `init()`, and it runs while user registers. `addSupertokensRecipe` throws when the `supertokensInitialized` decorator already exists.[^recipe-registry][^st-plugin] A test pins this down.[^phone-auth-test] See [SuperTokens is already initialised](../troubleshooting/supertokens-already-initialised.md).

### user before firebase
Firebase controllers call `fastify.verifySession()` **at route registration** to build their preHandlers.[^firebase-controller] In this monorepo, user is what decorates `verifySession`.[^st-plugin]

### Work deferred to `onReady`
- user seeds the `ADMIN`, `SUPERADMIN`, `USER` and configured roles in `onReady`, which needs the SuperTokens core to be reachable.[^user-plugin]
- phone-auth adds `users.phone_number` and extends the GraphQL `User` type in `onReady`. It has to register before user, but the users table only exists after user registers.[^phone-auth-plugin][^phone-auth-test]

## Two root error handlers
- The error-handler plugin calls `fastify.setErrorHandler`.[^error-handler-plugin]
- The user plugin's SuperTokens sub-plugin also calls it, unless `config.user.supertokens.setErrorHandler === false`.[^st-plugin]

Both are installed on the root context, so which one handles errors depends on registration order and that flag. The user GUIDE recommends setting `setErrorHandler: false` and passing `supertokensErrorHandler` as error-handler's `preErrorHandler`.[^user-guide-error-handler]

## Open questions
- No document in the repository states the full multi-package order in one place. The sequence above is reconstructed from code. Please confirm it.
- The user GUIDE setup example wires `preErrorHandler: supertokensErrorHandler` but does not set `setErrorHandler: false`.[^user-guide-setup] With user registered after error-handler, the SuperTokens handler would presumably replace error-handler's handler. Is the example intentional?

[^config-plugin]: `fastify.decorate("config")`, an `onRequest` hook assigning `request.config`, and `hostname = baseUrl:port`.
[^error-handler-plugin]: Registers `@fastify/sensible`, calls `setErrorHandler`, and calls `addSchema(errorSchema)`.
[^slonik-plugin]: Registers the internal slonik plugin, runs extension migrations, and calls `decorateRequest("dbSchema", "")`.
[^slonik-connect]: `db.pool.connect` at registration; on failure logs `🔴 Error happened while connecting to Postgres DB` and throws.
[^graphql-plugin]: Comment on L30-31: the transport is registered first "so its catch-all content-type parser is snapshotted into the mercurius context".
[^s3-plugin]: Throws if `!fastify.slonik`, then `runMigrations`, then `@fastify/multipart` when `options.rest?.enabled`.
[^phone-auth-plugin]: Calls `addSupertokensRecipe` synchronously; migration and schema extension run in `onReady`. The comment explains why.
[^user-plugin]: Order: supertokens plugin → onReady `seedRoles` → `runMigrations` → decorate `hasPermission` → mercurius-auth (if graphql enabled) → route controllers.
[^st-plugin]: Order: `init(fastify)` (supertokens.init) → `setErrorHandler` unless disabled → register SuperTokens' fastify plugin → decorate `verifySession`.
[^recipe-registry]: The comment on L5-8 explains the single-init constraint; throws if `hasDecorator("supertokensInitialized")`.
[^user-queries]: `photo_id INTEGER` with `FOREIGN KEY (photo_id) REFERENCES ${config.s3?.table?.name || TABLE_FILES}`.
[^firebase-plugin]: Runs migrations and init unless `enabled === false`, then registers controllers with `routePrefix`.
[^firebase-controller]: `preHandler: [fastify.verifySession(), isFirebaseEnabled(fastify)]` is evaluated when the route is defined.
[^graphql-guide-gotchas]: "register the s3 plugin **after** this plugin".
[^user-guide-setup]: Setup shows config, cors, formbody, error-handler with `preErrorHandler`, then user.
[^user-guide-error-handler]: Documents `setErrorHandler: false` plus manual wiring into `preErrorHandler`.
[^photo-storage-spec]: §1: "A deployment that never uses photos still cannot start without the s3 plugin having created the `files` table first".
[^phone-auth-test]: "runs the migration on ready, not during registration" and "throws when registered after SuperTokens has already been initialised".
