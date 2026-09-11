---
type: Component
title: fastify-config
description: The package that decorates the Fastify instance and every request with the app's ApiConfig object and defines the base ApiConfig type other packages augment.
tags: [config, api-config, decorator, package]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: plugin
    resource: repo://packages/config/src/plugin.ts#L7-L24
    title: Config plugin
  - id: types
    resource: repo://packages/config/src/types.ts#L8-L63
    title: ApiConfig and AppConfig
  - id: index
    resource: repo://packages/config/src/index.ts#L3-L16
    title: Fastify augmentation and exports
  - id: invitation-apps
    resource: repo://packages/user/src/model/invitations/service.ts#L88-L95
    title: AppConfig.supportedRoles consumed by invitations
  - id: create-invitation-host
    resource: repo://packages/user/src/model/invitations/handlers/createInvitation.ts#L60-L64
    title: hostname used as invitation URL fallback
  - id: adr
    resource: repo://packages/config/ADR-CONFIG.md
    title: Configuration ADR (Proposed)
  - id: spec
    resource: repo://packages/config/SPEC-APICONFIG.md
    title: ApiConfig spec (Draft)
  - id: test
    resource: repo://packages/config/src/__test__/plugin.test.ts
    title: Config plugin tests
---

# fastify-config

**Responsibility:** make one config object available as `fastify.config` and `request.config`, and own the base `ApiConfig` type. It does **not** read environment variables, validate anything, or know about other packages' keys.

## Entrypoint
`register(configPlugin, { config })`:[^plugin]
1. `fastify.decorate("config", config)`.
2. A root `onRequest` hook sets `request.config = config`. It is the same object reference on every request, not a copy.
3. `fastify.decorate("hostname", `${baseUrl}:${port}`)`.

## The `ApiConfig` type
Base keys: `appName`, `appOrigin[]`, `apps?`, `baseUrl`, `env`, `logger`, `name`, `pagination?`, `port`, `protocol`, `rest.enabled`, `version`.[^types] Every other package adds its own namespace through `declare module "@prefabs.tech/fastify-config" { interface ApiConfig { ... } }` in its `index.ts`. That is why consumers see `config.user`, `config.slonik`, and so on. The package's own `index.ts` augments only `FastifyInstance.config`, `FastifyInstance.hostname`, and `FastifyRequest.config`.[^index]

`AppConfig` (`id`, `name`, `origin`, `supportedRoles`) describes client apps. The user package rejects an invitation whose role is not in the matching app's `supportedRoles`.[^invitation-apps]

## Things other packages read from the base config
- `appOrigin[0]` is SuperTokens' `websiteDomain` and the email verification link origin. `baseUrl` is SuperTokens' `apiDomain` ([user](user.md)).
- `rest.enabled` is injected into s3's deprecated fallback path ([s3](s3.md)).
- `hostname` is the last fallback URL for invitation emails, after the `referer` and `origin` headers.[^create-invitation-host]
- `pagination` in snake_case is declared here but not read by the data layer, which reads `slonik.pagination` ([Data access layer](../architecture/data-access-layer.md)).

## Depended on by
Every package, directly or through types. See [Build graph](../architecture/build-graph.md).

## Direction of travel
Draft documents propose shrinking `ApiConfig` to base keys, removing package augmentations, and adding startup validation.[^adr][^spec] See [Plugin options migration](../architecture/plugin-options-migration.md). CLAUDE.md names this package the canonical GUIDE.md format reference.

## Tests
`src/__test__/plugin.test.ts`.[^test]

[^plugin]: The whole plugin is 15 lines; wrapped with `FastifyPlugin`.
[^types]: `interface ApiConfig` L8-52; `AppConfig` L54-59.
[^index]: Augments `FastifyInstance.config`, `FastifyInstance.hostname`, `FastifyRequest.config`.
[^invitation-apps]: Throws `ROLE_NOT_SUPPORTED` when `app && !app.supportedRoles.includes(role)`.
[^create-invitation-host]: `headers.referer || headers.origin || hostname`.
[^adr]: Status "Proposed", dated 2026-04-02.
[^spec]: Status "Draft", dated 2026-07-12.
[^test]: Tests for the config package's registration behaviour.
