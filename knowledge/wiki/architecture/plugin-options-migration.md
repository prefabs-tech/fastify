---
type: Architecture
title: Plugin Options Migration
description: The in-progress move from plugins reading fastify.config to plugins receiving options at register(); which packages have moved, how the fallback is detected, and where the old config shape is still load-bearing.
tags: [config, deprecation, plugin-options, api-config, migration]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: slonik-plugin
    resource: repo://packages/slonik/src/plugin.ts#L12-L27
    title: Slonik options fallback
  - id: migration-plugin
    resource: repo://packages/slonik/src/migrationPlugin.ts#L9-L26
    title: migrationPlugin options fallback
  - id: graphql-plugin
    resource: repo://packages/graphql/src/plugin.ts#L12-L27
    title: GraphQL options fallback
  - id: mailer-plugin
    resource: repo://packages/mailer/src/plugin.ts#L14-L29
    title: Mailer options fallback
  - id: s3-plugin
    resource: repo://packages/s3/src/plugin.ts#L10-L40
    title: S3 Partial options and fallback
  - id: s3-index
    resource: repo://packages/s3/src/index.ts#L7-L37
    title: Deprecated augmentation and exports
  - id: s3-queries
    resource: repo://packages/s3/src/migrations/queries.ts#L10-L17
    title: Query builder accepts both shapes
  - id: s3-service
    resource: repo://packages/s3/src/model/files/service.ts#L59-L61
    title: FileService reads config.s3.clientConfig
  - id: s3-service-strategy
    resource: repo://packages/s3/src/model/files/service.ts#L160-L163
    title: FileService reads config.s3.filenameResolutionStrategy
  - id: s3-factory
    resource: repo://packages/s3/src/model/files/sqlFactory.ts#L5-L13
    title: FileSqlFactory reads config.s3.table
  - id: user-file-service
    resource: repo://packages/user/src/model/users/service.ts#L25-L35
    title: UserService constructs FileService with ApiConfig
  - id: firebase-plugin
    resource: repo://packages/firebase/src/plugin.ts#L10-L23
    title: Firebase reads fastify.config only
  - id: user-plugin
    resource: repo://packages/user/src/plugin.ts#L18-L19
    title: User reads fastify.config only
  - id: phone-auth-plugin
    resource: repo://packages/phone-auth/src/plugin.ts#L10-L15
    title: Phone auth reads fastify.config only
  - id: swagger-plugin
    resource: repo://packages/swagger/src/plugin.ts#L9-L16
    title: Swagger options only
  - id: adr
    resource: repo://packages/config/ADR-CONFIG.md
    title: "ADR: Application Configuration Architecture (Proposed, 2026-04-02)"
  - id: spec
    resource: repo://packages/config/SPEC-APICONFIG.md
    title: "SPEC: ApiConfig after plugin-config decoupling (Draft, 2026-07-12)"
  - id: commit-s3-options
    resource: repo://packages/s3/src/plugin.ts
    title: "Commit 81251d3f, 2026-07-11: feat(s3): accept plugin options directly, deprecate fastify.config fallback (#1127)"
  - id: claude-md
    resource: repo://CLAUDE.md
    title: Mistakes table entry 22 (Partial options during the deprecation window)
---

# Plugin Options Migration

## What is changing
**Old pattern:** the app builds one `ApiConfig` object and registers the config plugin. Each package then reads its namespace from `fastify.config.<name>`, typed through a `declare module "@prefabs.tech/fastify-config"` augmentation.

**New pattern:** each package exports its own options type and receives it directly:

```ts
await fastify.register(s3Plugin, config.s3);
```

Under the draft ApiConfig spec, the package augmentations are removed, `ApiConfig` keeps only base keys, and the **app** composes its own `AppConfig extends ApiConfig { s3: S3Config; ... }`.[^spec] The ADR goes further and recommends zod schema composition validated at startup. It is still marked **Proposed**, and no validation exists in the config package today.[^adr]

## Status by package

| Package | Accepts options | Fallback when options are empty | Still `fastify.config`-only |
|---------|-----------------|--------------------------------|-----------------------------|
| config | `{ config }` (it is the source) | n/a | n/a |
| error-handler | yes | none | no |
| swagger | yes[^swagger-plugin] | none | no |
| slonik, `migrationPlugin` | yes | `fastify.config.slonik`, with a warning[^slonik-plugin][^migration-plugin] | no |
| graphql | yes | `fastify.config.graphql`[^graphql-plugin] | no |
| mailer | yes | `fastify.config.mailer`[^mailer-plugin] | no |
| s3 | `Partial<S3Options>` | `{ ...config.s3, rest: config.rest }`[^s3-plugin] | **partly**, see below |
| firebase | no | n/a | yes[^firebase-plugin] |
| user | no | n/a | yes[^user-plugin] |
| phone-auth | no | n/a | yes[^phone-auth-plugin] |

## How the fallback is detected
Every migrated plugin tests `Object.keys(options).length === 0`. If that is true, it logs `"The <x> plugin now recommends passing <x> options directly to the plugin."` and substitutes the config namespace. If that namespace is missing too, it throws `Missing <x> configuration. Did you forget to pass it to the <x> plugin?`.[^slonik-plugin]

Consequences:
- Options and config are **never merged**. Passing any key at all disables the fallback completely.
- `register(plugin)` and `register(plugin, {})` behave identically.
- The s3 fallback injects the app-level `config.rest` into the options, since `rest.enabled` decides whether multipart is registered.[^s3-plugin]

## Where the old shape is still load-bearing
s3's **plugin** runs happily on options alone. The code it exports does not:
- `FileService` builds its S3 client from `this.config.s3.clientConfig` and reads `this.config.s3.filenameResolutionStrategy`.[^s3-service][^s3-service-strategy]
- `FileSqlFactory` reads `this.config.s3?.table?.name`.[^s3-factory]
- `UserService` constructs `FileService` with the full `ApiConfig`, for photo upload, presigned URLs and deletion.[^user-file-service]

So any app that uses `FileService`, including through the user package's photo features, still needs `s3` on the config object handed to services. This holds even after moving s3 registration to options. The augmentation's JSDoc describes the key as supporting "the fastify.config configuration fallback only".[^s3-index] That reads narrower than what the code actually requires.

## Typing during the window
Plugins that still accept a bare `register(plugin)` type their parameter as `Partial<XOptions>`. Otherwise `FastifyPluginOptions` would not be assignable. They switch to required options only when the fallback is removed.[^s3-plugin][^claude-md]

`createFilesTableQuery` temporarily accepts either an `ApiConfig` or `Partial<S3Options>`, and tells them apart with `"s3" in config`.[^s3-queries]

## Deprecated surface to avoid in new code
- `ApiConfig.s3` augmentation, `multipartParserPlugin`, and the `GraphQLUpload`/`GraphQLFileUpload` re-exports from s3. The upload transport moved to graphql.[^s3-index]
- Registering slonik, graphql, mailer, s3 or `migrationPlugin` without options.

## Open questions
- Is there a timeline or target version for removing the fallbacks and the `ApiConfig` augmentations?
- Will firebase, user, and phone-auth move to options? The user-photo-storage spec says a step-1 `UserOptions` migration lands alongside that work.
- How will `FileService` be decoupled from `config.s3` once the augmentation is removed?

[^spec]: §1-3: base keys only; plugins export their config types without augmentation; the app composes `AppConfig`.
[^adr]: Recommends "Option 3: Plugin-Driven Schema Composition" with zod; header status "Proposed".
[^swagger-plugin]: Destructures `fastifySwaggerOptions`, `uiOptions`; returns if `enabled === false`.
[^slonik-plugin]: L15-27.
[^migration-plugin]: Same pattern; error text says "migration configuration".
[^graphql-plugin]: L15-27.
[^mailer-plugin]: L17-29.
[^s3-plugin]: Comment L10-12 explains the `Partial` window; fallback L25-40.
[^firebase-plugin]: `const { config, log, slonik } = fastify` with no options parameter.
[^user-plugin]: `const { graphql, user } = fastify.config`.
[^phone-auth-plugin]: Reads `fastify.config.phoneAuth`.
[^s3-service]: `new S3Client(this.config.s3.clientConfig)`.
[^s3-service-strategy]: `filenameResolutionStrategy || this.config.s3.filenameResolutionStrategy`.
[^s3-factory]: `this.config.s3?.table?.name || super.table`.
[^user-file-service]: `new FileService(this.config, this.database, this.schema)`.
[^s3-index]: `@deprecated` JSDoc on L9-12, L23-25, L32-33.
[^s3-queries]: Comment: "the ApiConfig overload will be removed in a future release".
[^claude-md]: CLAUDE.md mistakes table, row 22.
