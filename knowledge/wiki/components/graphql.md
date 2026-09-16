---
type: Component
title: fastify-graphql
description: The mercurius wrapper package, which owns GraphQL enablement, the request context builder with its plugin extension point, the shared base schema, and the multipart upload transport.
tags: [graphql, mercurius, uploads, package]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: index
    resource: repo://packages/graphql/src/index.ts#L6-L45
    title: Augmentations and exports
  - id: plugin
    resource: repo://packages/graphql/src/plugin.ts#L12-L52
    title: Plugin
  - id: types
    resource: repo://packages/graphql/src/types.ts#L10-L36
    title: Config types
  - id: constants
    resource: repo://packages/graphql/src/constants.ts#L1-L4
    title: Default path and transport plugin name
  - id: transport
    resource: repo://packages/graphql/src/uploads/transport.ts#L18-L55
    title: Upload transport
  - id: busboy
    resource: repo://packages/graphql/src/uploads/processMultipartFormData.ts#L9-L65
    title: Busboy multipart body for non-GraphQL routes
  - id: spec
    resource: repo://docs/specs/graphql-upload-transport.md
    title: Spec, move upload transport from s3 to graphql (implemented)
  - id: upload-test
    resource: repo://packages/graphql/src/__test__/uploadTransport.test.ts
    title: Upload transport tests
---

# fastify-graphql

**Responsibility:** register mercurius when enabled, build the per-request GraphQL context, and own the GraphQL multipart transport. It does not define auth. The `@auth` and `@hasPermission` directives are declared here but implemented by [user](user.md).

## Registration
- Options fall back to `fastify.config.graphql` ([migration](../architecture/plugin-options-migration.md)).
- Nothing happens unless `enabled` is truthy.
- The upload transport is registered first, then `mercurius` with `{ context: buildContext(options.plugins), ...options }`.[^plugin] The full flow is on [GraphQL request lifecycle](../architecture/graphql-request-lifecycle.md).

## Options (`GraphqlConfig extends MercuriusOptions`)
- `enabled?`
- `plugins?: GraphqlEnabledPlugin[]`: context extenders called in order.
- `uploads?: GraphqlUploadsConfig`: extends `graphql-upload-minimal`'s `UploadOptions` (`maxFileSize`, `maxFiles`, …) and adds `enabled?`.[^types]

Everything else passes through to mercurius, including `schema`, `resolvers` and `path`.

## Exports
Default plugin, `baseSchema`, `graphqlUploadTransport`, `DEFAULT_GRAPHQL_PATH` (`/graphql`), `UPLOAD_TRANSPORT_PLUGIN_NAME`, and the re-exports `gql`, `mergeTypeDefs`, `DocumentNode`, `GraphQLUpload`, `GraphQLFileUpload`.[^index][^constants]

It augments `MercuriusContext` with `config`, `database` and `dbSchema`, `ApiConfig` with `graphql`, and `FastifyRequest` with `graphqlFileUploadMultipart`.

## Upload transport
- A named fastify-plugin, `prefabs-graphql-upload-transport`, so it is detectable with `hasPlugin`.[^transport]
- It installs the **only** app-global `*` content-type parser. An app with its own catch-all must set `uploads.enabled: false`.
- Multipart requests outside the GraphQL path go through busboy. Fields and **fully buffered** files are placed on `req.body`, and busboy errors are only logged.[^busboy]
- It moved here from s3 to remove a hidden dependency: user's `uploadPhoto` mutation relied on an app-registered s3 parser. It also removes an ordering trap, since a parser registered after mercurius produces a silent 415.[^spec]

## Depends on
config and slonik (types, plus request decorators read at request time), mercurius, graphql.

## Depended on by
s3 (deprecated transport wrapper and types), firebase and user (schemas and resolvers), phone-auth (extends the `User` type at `onReady`).

## Extension seams
- `plugins[]` with `updateContext(context, request, reply)`.
- Merging `baseSchema` into app schemas with `mergeTypeDefs`.
- A custom `context` function, which replaces the default builder entirely.

## Tests
- `uploadTransport.test.ts`: parsing on the default and custom paths, busboy outside the GraphQL path, no 415, registration toggles and dedupe.[^upload-test]
- `plugin.test.ts`, `baseSchema.test.ts`, `context.spec.ts`.

[^index]: L6-24 augmentations; L26-45 exports.
[^plugin]: See the lifecycle page for line-level detail.
[^types]: `GraphqlUploadsConfig extends UploadOptions { enabled?: boolean }`.
[^constants]: `DEFAULT_GRAPHQL_PATH = "/graphql"`.
[^transport]: `fastifyPlugin(plugin, { fastify: ">= 4.x", name: UPLOAD_TRANSPORT_PLUGIN_NAME })`.
[^busboy]: `busboyParser.on("error", (err) => req.log.error(err))` never calls `done`.
[^spec]: Spec §1 problem statement; status "implemented on branch refact/config (2026-07-11)".
[^upload-test]: Test names listed via grep on 2026-09-11.
