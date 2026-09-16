---
type: Component
title: fastify-swagger
description: A thin wrapper that registers @fastify/swagger and @fastify/swagger-ui behind an enabled flag and exposes the documentation route prefix as decorators.
tags: [swagger, openapi, documentation, package]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: plugin
    resource: repo://packages/swagger/src/plugin.ts#L9-L33
    title: Swagger plugin
  - id: types
    resource: repo://packages/swagger/src/types.ts#L4-L10
    title: SwaggerOptions
  - id: index
    resource: repo://packages/swagger/src/index.ts#L1-L10
    title: Augmentation
  - id: pkg
    resource: repo://packages/swagger/package.json
    title: Dependencies and peer metadata
  - id: guide
    resource: repo://packages/swagger/GUIDE.md#L329
    title: GUIDE note on route registration order
  - id: ajv-file
    resource: repo://packages/s3/src/plugins/ajvFile.ts#L18-L44
    title: s3 isFile keyword rewrites schemas to binary for docs
---

# fastify-swagger

**Responsibility:** turn OpenAPI generation and the docs UI on or off with one options object. It adds no schema transforms of its own.

## Registration
1. If `options.enabled === false`, log and return.[^plugin]
2. `register(@fastify/swagger, fastifySwaggerOptions)`.
3. `register(@fastify/swagger-ui, uiOptions ?? {})`.
4. Decorate **both** `swaggerUIRoutePrefix` and `apiDocumentationPath` with `uiOptions.routePrefix ?? "/documentation"`. They are two names for the same value.[^plugin][^index]

Options are `{ enabled?, fastifySwaggerOptions, uiOptions? }`, with the two library option types passed through untouched.[^types] This package has no `fastify.config` fallback.

## Relationships
- No sibling dependencies; `@fastify/swagger` and `@fastify/swagger-ui` are regular dependencies.[^pkg]
- The GUIDE states routes can be registered before or after this plugin.[^guide]
- File-upload fields documented with s3's `isFile` Ajv keyword render as `string`/`binary`.[^ajv-file]

## Quirk
`peerDependenciesMeta` marks `openapi-types` optional, but `openapi-types` is not listed in `peerDependencies`.[^pkg]

## Tests
`src/__test__/plugin.test.ts`. CLAUDE.md names it, alongside firebase, as a reference test suite.

[^plugin]: The whole plugin is 25 lines.
[^types]: `fastifySwaggerOptions: TSwaggerOptions; uiOptions?: FastifySwaggerUiOptions`.
[^index]: Augments `FastifyInstance.apiDocumentationPath` and `swaggerUIRoutePrefix`.
[^pkg]: `dependencies` holds `@fastify/swagger` 9.8.1 and `@fastify/swagger-ui` 6.1.0.
[^guide]: "Route registered before or after plugin — both work".
[^ajv-file]: At compile time it sets `type = "string"` and `format = "binary"`.
