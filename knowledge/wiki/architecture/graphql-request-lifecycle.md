---
type: Architecture
title: GraphQL Request Lifecycle
description: How a /graphql request is parsed, how its mercurius context is built and extended by plugins, and how the @auth and @hasPermission directives enforce the same rules as REST.
tags: [graphql, mercurius, mercurius-auth, uploads, authorization]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: graphql-plugin
    resource: repo://packages/graphql/src/plugin.ts#L12-L52
    title: GraphQL plugin
  - id: transport
    resource: repo://packages/graphql/src/uploads/transport.ts#L18-L55
    title: Upload transport
  - id: build-context
    resource: repo://packages/graphql/src/buildContext.ts#L6-L22
    title: buildContext
  - id: graphql-types
    resource: repo://packages/graphql/src/types.ts#L10-L23
    title: GraphqlConfig and GraphqlEnabledPlugin
  - id: base-schema
    resource: repo://packages/graphql/src/baseSchema.ts#L3-L35
    title: Base schema directives and inputs
  - id: user-plugin
    resource: repo://packages/user/src/plugin.ts#L31-L60
    title: User plugin exposes updateContext
  - id: user-context
    resource: repo://packages/user/src/userContext.ts#L10-L34
    title: User updateContext
  - id: merc-auth-wrapper
    resource: repo://packages/user/src/mercurius-auth/plugin.ts#L8-L15
    title: mercurius-auth registration
  - id: auth-plugin
    resource: repo://packages/user/src/mercurius-auth/authPlugin.ts#L12-L100
    title: "@auth directive policy"
  - id: perm-plugin
    resource: repo://packages/user/src/mercurius-auth/hasPermissionPlugin.ts#L9-L50
    title: "@hasPermission directive policy"
  - id: users-factory
    resource: repo://packages/user/src/model/users/sqlFactory.ts#L16-L57
    title: UserSqlFactory soft delete
  - id: slonik-where
    resource: repo://packages/slonik/src/sqlFactory.ts#L306-L332
    title: getWhereFragment adds soft-delete filter
  - id: device-resolver
    resource: repo://packages/firebase/src/model/userDevice/graphql/resolver.ts#L5-L98
    title: Resolver error style
  - id: graphql-guide-plugins
    resource: repo://packages/graphql/GUIDE.md#L170-L250
    title: GraphQL GUIDE, context plugins
---

# GraphQL Request Lifecycle

## Enabling
GraphQL is **off unless `enabled` is truthy**.[^graphql-plugin] This is the opposite of the repo-wide convention that `undefined` means enabled ([Conventions](../conventions/enforced-and-observed-conventions.md)). `uploads.enabled` does follow the convention, since only `=== false` disables it.

## 1. Transport: parsing multipart uploads
The graphql plugin registers the upload transport **before** mercurius, and skips it when `uploads.enabled === false` or a plugin named `prefabs-graphql-upload-transport` is already registered.[^graphql-plugin]

The transport adds two pieces:[^transport]
1. A catch-all `*` content-type parser:
   - Multipart request whose `routeOptions.url` starts with the GraphQL path: flag the request and leave the stream untouched.
   - Multipart request anywhere else: parse with busboy. Busboy calls `done` itself; the comment warns against also calling it synchronously.
   - Anything else: `done(null)`, which leaves the body undefined and does **not** return 415.
2. A `preValidation` hook that runs `graphql-upload-minimal`'s `processRequest` for flagged requests only.

The path defaults to `/graphql` and is resolved inside the plugin from `options.path`.

## 2. Context
mercurius receives `context: buildContext(options.plugins)`, then `...options` is spread **after** it.[^graphql-plugin] Two consequences:
- A caller-supplied `context` replaces `buildContext` entirely, and `plugins` are then never called.
- Without one, each request gets `{ config, database: request.slonik, dbSchema }`, and each `plugins[i].updateContext(context, request, reply)` then runs **in array order**.[^build-context][^graphql-guide-plugins]

A `GraphqlEnabledPlugin` is any Fastify plugin that also carries `updateContext`.[^graphql-types] The user plugin's default export is exactly that: `FastifyPlugin(userPlugin)` with `updateContext: userContext` attached.[^user-plugin]

The user package's `updateContext`:[^user-context]
1. Calls `Session.getSession(request, reply, { sessionRequired: false })` with the `EmailVerification` and `ProfileValidation` claim validators filtered out, so anonymous and incomplete users still get a context.
2. Swallows SuperTokens errors and rethrows anything else.
3. Sets `context.user = request.user` and `context.roles = request.user?.roles`. `request.user` was loaded by the `getSession` override, as on the REST path.

> Inference: `context.user` is only populated when the user plugin is passed in the graphql options' `plugins` array. Nothing else in the repository calls `userContext`. Confirm this is the intended wiring.

## 3. Directives
`baseSchema` declares `@auth(profileValidation: Boolean, emailVerification: Boolean)` and `@hasPermission(permission: String!)`, along with the `Filters`, `SortInput`, `DateTime`, `JSON` and `DeleteResult` types.[^base-schema] The user package implements both directives by registering two mercurius-auth instances, `hasPermission` first and then `auth`, and only when graphql is enabled.[^merc-auth-wrapper]

`@auth` policy, in order:[^auth-plugin]

| Check | Failure |
|-------|---------|
| `context.user` present | 401 `unauthorized` |
| `!context.user.disabled` | 401 `user is disabled` |
| Email verified, only if `features.signUp.emailVerification` and the directive argument is not `false` | 403 `invalid claim` with `claimValidationErrors: [{ id: "st-ev", ... }]` |
| Profile claim, only if `features.profileValidation.enabled` and the argument is not `false`: `fetchAndSetClaim`, then `assertClaims` | 403 `invalid claim` with the SuperTokens error payload |

`@hasPermission` returns 401 without a user. It returns 403 with `claimValidationErrors: [{ id: "st-perm", reason: { expectedToInclude } }]` when `hasUserPermission` fails.[^perm-plugin] The code comments say these payloads were shaped to **match the REST responses**.

### Deleted users
REST revokes sessions for deleted users inside the `verifySession` override. The GraphQL path does not call that override. Soft-deleted users are still excluded: `UserSqlFactory` enables soft delete, and `getWhereFragment` appends `deleted_at IS NULL` by default. A soft-deleted user therefore loads as no user and fails `@auth` with 401.[^users-factory][^slonik-where]

## 4. Resolvers
Resolvers **return** `new mercurius.ErrorWithProps(message, {}, status)` rather than throwing. They check feature flags themselves, for example `config.firebase.enabled === false` → 404. They also wrap service calls in try/catch that logs and returns a generic 500.[^device-resolver] REST handlers throw `httpErrors` instead. Keep both surfaces in parity when adding operations.

## Related
- [REST request lifecycle](rest-request-lifecycle.md)
- [GraphQL uploads return 415 or an empty body](../troubleshooting/graphql-uploads-415-or-empty-body.md)
- [graphql component](../components/graphql.md), [user component](../components/user.md)

[^graphql-plugin]: `if (options?.enabled)`; transport guarded by `uploads?.enabled !== false && !hasPlugin(...)`; `register(mercurius, { context: buildContext(options.plugins), ...options })`.
[^transport]: Parser L25-41, hook L43-49, plugin name L52-55.
[^build-context]: Base context, then `await plugin.updateContext(context, request, reply)` per plugin.
[^graphql-guide-plugins]: GUIDE: "a caller-provided `context` can override this default".
[^graphql-types]: `interface GraphqlEnabledPlugin extends FastifyPluginAsync, FastifyPluginCallback { updateContext }`.
[^base-schema]: The `gql` document exported as `baseSchema`.
[^user-plugin]: `Object.assign(FastifyPlugin(userPlugin), { updateContext: userContext }) satisfies GraphqlEnabledPlugin`.
[^user-context]: `overrideGlobalClaimValidators` filters `EmailVerificationClaim.key` and `ProfileValidationClaim.key`.
[^merc-auth-wrapper]: Returns early if `!fastify.config.graphql?.enabled`.
[^auth-plugin]: `authDirective: "auth"`.
[^perm-plugin]: `authDirective: "hasPermission"`.
[^users-factory]: `protected _softDeleteEnabled = true`; `getFindByIdSql` uses `getWhereFragment({ filterFragment })`.
[^slonik-where]: `includeSoftDelete = true` by default pushes `<table>.deleted_at IS NULL`.
[^device-resolver]: `addUserDevice` and `removeUserDevice` mutations.
