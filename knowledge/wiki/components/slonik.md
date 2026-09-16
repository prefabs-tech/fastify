---
type: Component
title: fastify-slonik
description: The Postgres foundation package, providing the connection-verified slonik pool and decorators, boot-time extensions, the SQL-file migration plugin, and the BaseService/DefaultSqlFactory/filter toolkit every data package extends.
tags: [slonik, postgres, migrations, package, data-access]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: index
    resource: repo://packages/slonik/src/index.ts#L7-L46
    title: Augmentations and exports
  - id: plugin
    resource: repo://packages/slonik/src/plugin.ts#L12-L42
    title: Plugin
  - id: slonik
    resource: repo://packages/slonik/src/slonik.ts#L4-L59
    title: Internal fastify-slonik plugin (copied)
  - id: create-db
    resource: repo://packages/slonik/src/createDatabase.ts#L9-L25
    title: createDatabase
  - id: run-migrations
    resource: repo://packages/slonik/src/migrations/runMigrations.ts#L6-L16
    title: Extension creation
  - id: extensions
    resource: repo://packages/slonik/src/constants.ts#L1
    title: Default extensions
  - id: migration-plugin
    resource: repo://packages/slonik/src/migrationPlugin.ts#L9-L29
    title: migrationPlugin
  - id: migrate
    resource: repo://packages/slonik/src/migrate.ts#L8-L37
    title: migrate (pg Client + postgres-migrations)
  - id: options
    resource: repo://packages/slonik/src/types/config.ts#L5-L19
    title: SlonikOptions
  - id: pkg
    resource: repo://packages/slonik/package.json
    title: Dependencies (pg-mem optional peer)
  - id: feature-md
    resource: repo://packages/slonik/feature.md
    title: Older features reference (states Version 0.93.5)
---

# fastify-slonik

**Responsibility:** own the database connection and give every other package one way to talk to Postgres. It does not define any tables itself.

## Registration (`register(slonikPlugin, options)`)
1. Resolve options, falling back to `fastify.config.slonik` ([Plugin options migration](../architecture/plugin-options-migration.md)).[^plugin]
2. Register the internal `fastify-slonik` plugin. Its code comment dates it as copied from `spa5k/fastify-slonik` on 2023-01-28.[^slonik]
   - `createDatabase` builds the pool with `createClientConfig` ([defaults and interceptors](../architecture/data-access-layer.md#row-pipeline)).[^create-db]
   - It **opens a connection immediately**. On failure it logs an error and throws `new Error(error as string)`, which discards the original error type.[^slonik]
   - It decorates `fastify.slonik` and `fastify.sql`, and assigns `request.slonik` and `request.sql` in `onRequest`, guarded by `hasDecorator`/`hasRequestDecorator`, so registering twice is harmless.
3. `CREATE EXTENSION IF NOT EXISTS` for `citext`, `unaccent` and anything in `options.extensions` (deduplicated), **on every boot**.[^run-migrations][^extensions]
4. `decorateRequest("dbSchema", "")`.

## `migrationPlugin` and `migrate`
These are separate from the plugin above. They apply the **app's SQL migration files** using `@prefabs.tech/postgres-migrations`:[^migration-plugin][^migrate]
- A dedicated `pg.Client` is built from `options.db`, with `ssl` copied only from `clientConfiguration.ssl`. It is connected, runs the migrations, and is closed.
- The directory is `options.migrations.path`, defaulting to the string `"migrations"`.
- These run whenever the plugin is registered. The GUIDE suggests registering it before the main plugin if migrations should run first.

Package-owned tables (users, files, and so on) do **not** go through this. See [Package schema migrations](../operations/package-schema-migrations.md).

## Exports
Default plugin, `migrationPlugin`, `createDatabase`, `BaseService`, `DefaultSqlFactory`, filter helpers (`applyFilter`, `applyFiltersToQuery`, `buildFilterFragment`), SQL helpers (`createFilterFragment`, `createLimitFragment`, `createSortFragment`, `createTableFragment`, `createTableIdentifier`, `createWhereFragment`, `createWhereIdFragment`, `isValueExpression`), `formatDate`, `createBigintTypeParser`, and all types.[^index]

`formatDate(date)` returns `YYYY-MM-DD HH:mm:ss.SSS` taken from `toISOString()`, so it is UTC. Packages use it to write timestamps.

## Options
`db` (slonik `ConnectionOptions`), `clientConfiguration`, `extensions`, `migrations.path`, `pagination.{defaultLimit,maxLimit}`, `queryLogging.enabled`.[^options]

## Depended on by
graphql (context `database`), s3, firebase, user, phone-auth. See [Build graph](../architecture/build-graph.md).

## Extension seams
- Subclass `BaseService` and `DefaultSqlFactory`. See [Data access layer](../architecture/data-access-layer.md).
- Pass extra `clientConfiguration.interceptors`; they run after the built-in ones.
- Set `request.dbSchema` from the app. Nothing in this repository sets it.

## Testing
`pg-mem` is an **optional peer**, so consumers can use it for their own tests.[^pkg] This package's service and factory tests run against pg-mem through `src/__test__/helpers/createDatabase.ts`, so no Postgres server is needed.

## Docs note
Both `feature.md` (lowercase, which says "Version: 0.93.5") and `FEATURES.md` exist.[^feature-md] Only `FEATURES.md` follows the documentation system described in CLAUDE.md.

[^index]: Augments `FastifyInstance.slonik`/`sql`, `FastifyRequest.dbSchema`/`slonik`/`sql`, and `ApiConfig.slonik`.
[^plugin]: `createClientConfig(options.clientConfiguration, options.queryLogging?.enabled)` and `stringifyDsn(options.db)`.
[^slonik]: Comment `[OP 2023-JAN-28] Copy/pasted from https://github.com/spa5k/fastify-slonik`; catch block L27-30.
[^create-db]: Returns `{ connect, pool, query }` bound to the pool.
[^run-migrations]: `[...new Set([...EXTENSIONS, ...(options.extensions || [])])]`, all on one connection.
[^extensions]: `["citext", "unaccent"]`.
[^migration-plugin]: Same empty-options fallback as the main plugin.
[^migrate]: `defaultMigrationsPath = "migrations"`.
[^options]: `SlonikConfig` is an alias of `SlonikOptions`.
[^pkg]: `peerDependenciesMeta.pg-mem.optional: true`.
[^feature-md]: Its last commit is 081e597a (2026-04-28).
