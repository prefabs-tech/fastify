---
type: Architecture
title: REST Request Lifecycle
description: How an authenticated REST request moves through request decorators, body parsing, SuperTokens session verification, permission checks, a thin handler, the service layer, and the error handler.
tags: [fastify, request-lifecycle, supertokens, authorization, error-handling]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: config-plugin
    resource: repo://packages/config/src/plugin.ts#L13-L17
    title: request.config onRequest hook
  - id: slonik-connect
    resource: repo://packages/slonik/src/slonik.ts#L37-L48
    title: request.slonik onRequest hook
  - id: slonik-plugin
    resource: repo://packages/slonik/src/plugin.ts#L39
    title: request.dbSchema decorated as empty string
  - id: base-service-schema
    resource: repo://packages/slonik/src/service.ts#L38-L61
    title: BaseService schema fallback to public
  - id: s3-multipart
    resource: repo://packages/s3/src/plugin.ts#L44-L61
    title: "@fastify/multipart options in s3"
  - id: upload-transport
    resource: repo://packages/graphql/src/uploads/transport.ts#L25-L49
    title: Catch-all parser and preValidation hook
  - id: user-plugin-test-schema
    resource: repo://packages/user/src/__test__/plugin.test.ts#L34-L46
    title: Route schemas reference ErrorResponse#
  - id: users-controller
    resource: repo://packages/user/src/model/users/controller.ts#L38-L126
    title: Users routes and preHandlers
  - id: session-config
    resource: repo://packages/user/src/supertokens/recipes/config/sessionRecipeConfig.ts#L26-L94
    title: Session recipe overrides
  - id: get-session
    resource: repo://packages/user/src/supertokens/recipes/config/session/getSession.ts#L10-L37
    title: getSession override loads request.user
  - id: verify-session
    resource: repo://packages/user/src/supertokens/recipes/config/session/verifySession.ts#L9-L43
    title: verifySession override revokes deleted or disabled users
  - id: global-claims
    resource: repo://packages/user/src/supertokens/recipes/config/session/getGlobalClaimValidators.ts#L13-L29
    title: Global claim validators
  - id: has-permission
    resource: repo://packages/user/src/middlewares/hasPermission.ts#L8-L36
    title: hasPermission preHandler
  - id: add-user-device
    resource: repo://packages/firebase/src/model/userDevice/handlers/addUserDevice.ts#L7-L19
    title: Canonical thin handler
  - id: base-service-create
    resource: repo://packages/slonik/src/service.ts#L95-L107
    title: BaseService.create hook flow
  - id: client-config
    resource: repo://packages/slonik/src/factories/createClientConfig.ts#L30-L38
    title: Interceptor chain order
  - id: st-plugin
    resource: repo://packages/user/src/supertokens/plugin.ts#L17-L53
    title: SuperTokens error handler and refresh cookie onSend hook
  - id: error-handler-plugin
    resource: repo://packages/error-handler/src/plugin.ts#L53-L67
    title: preErrorHandler wrapper
  - id: error-handler
    resource: repo://packages/error-handler/src/errorHandler.ts#L52-L131
    title: Error mapping and masking
---

# REST Request Lifecycle

This page follows a request through a route such as `GET /users` (user package) or `POST /user-device` (firebase package), in execution order. Every step names the package that owns it, which tells you where to look when a step misbehaves.

## 1. onRequest: request decorators
- `request.config`: assigned by the config plugin's root `onRequest` hook.[^config-plugin]
- `request.slonik` and `request.sql`: assigned by slonik's root `onRequest` hook.[^slonik-connect]
- `request.dbSchema`: decorated as `""`.[^slonik-plugin] **No package in this repository ever assigns it.** Services fall back to `"public"` when it is empty.[^base-service-schema] It is a seam for the consuming app, for example per-tenant schemas.

## 2. Body parsing
- **s3 with `rest.enabled`**: `@fastify/multipart` parses `multipart/form-data` with `attachFieldsToBody: "keyValues"`. Its `onFile` reads **the whole file into a Buffer** (`part.toBuffer()`). Size is capped by `fileSizeLimitInBytes`, which defaults to `Infinity`.[^s3-multipart]
- **graphql with uploads enabled**:
  - A catch-all `*` parser sends multipart requests outside the GraphQL path through busboy.
  - Any other content type falls through with an undefined body rather than a 415.
  - A `preValidation` hook replaces the body only for flagged GraphQL multipart requests.[^upload-transport]

## 3. Schema validation
Route schemas declare their error responses with `$ref: "ErrorResponse#"`. That schema is registered by the error-handler plugin, so route compilation needs it; tests add it by hand.[^user-plugin-test-schema]

## 4. preHandler: `verifySession()`
The decorator is SuperTokens' fastify middleware. The user package overrides the session recipe it runs through.[^session-config]

1. **Token transport.** An `st-auth-mode: header` request header selects header tokens; otherwise cookies are used.
2. **`getSession` override.** It defaults `checkDatabase` to `config.user.supertokens.checkSessionInDatabase ?? true`. Once a session exists, it loads the app user row through `getUserService(config, slonik, dbSchema)` and writes it to `request.user`.[^get-session]
3. **`verifySession` API override.** After the session verifies, a user with `deletedAt` or `disabled` has the session **revoked** and gets a 401 via `fastify.httpErrors.unauthorized`.[^verify-session]
4. **Global claims.** The `ProfileValidationClaim` validator is added when `features.profileValidation.enabled`.[^global-claims] Routes that must work for incomplete profiles filter it out, along with `EmailVerificationClaim`, through `overrideGlobalClaimValidators`. `GET /me` and `PUT /me` do this.[^users-controller]

## 5. preHandler: `hasPermission(permission)`
- No `request.user`: throws SuperTokens `UNAUTHORISED`.
- `hasUserPermission` returns false: throws SuperTokens `INVALID_CLAIMS` with a `PermissionClaim` payload, which SuperTokens' error handling turns into a 403.[^has-permission]

The permission semantics are on [Authentication and authorization](../security/authentication-and-authorization.md).

## 6. Handler
Every route passes `handlersConfig?.x || handlers.x`, so the app can replace the handler.[^users-controller] The canonical handler is thin:[^add-user-device]
1. Destructure `{ body, config, dbSchema, slonik, user }` from `request`.
2. Throw `request.server.httpErrors.unauthorized` if there is no user.
3. Create `new Service(config, slonik, dbSchema)`.
4. `reply.send(await service.x(...))`.

## 7. Service → SQL factory → pool
`BaseService.create` runs `preCreate`, builds SQL with the factory, runs it on a pooled connection, then runs `postCreate`.[^base-service-create] Each returned row passes through the interceptor chain in this order:[^client-config]
1. `fieldNameCaseConverter`: snake_case → camelCase.
2. `resultParser`: zod validation when the query was typed.
3. The query-logging interceptor, if `queryLogging.enabled`.
4. The app's own interceptors.

Details are on [Data access layer](data-access-layer.md).

## 8. onSend
When `config.user.supertokens.refreshTokenCookiePath` is set, a root `onSend` hook rewrites the `Path=` of every `sRefreshToken` cookie in `set-cookie`.[^st-plugin]

## 9. Errors
The root error handler is either SuperTokens' handler (installed by user unless `setErrorHandler === false`) or the error-handler plugin's.[^st-plugin] The error-handler plugin handles errors as follows:[^error-handler-plugin][^error-handler]

| Error | Status | Logged at | Response body |
|-------|--------|-----------|---------------|
| `preErrorHandler` sent a reply | whatever it sent | n/a | whatever it sent (an exception inside `preErrorHandler` is swallowed) |
| `HttpError` (`@fastify/sensible`) | `statusCode` or 500 | error if ≥500, info if 4xx | `code`, `error`, `message`, `name`, `statusCode` |
| `error.name` in `domainErrorStatusMap` | mapped status | error if ≥500, info if 4xx | message and name kept; `code` only for `CustomError` |
| anything else | 500 | error | **masked**: `INTERNAL_SERVER_ERROR` / generic message, unless `stackTrace: true` |

Stack frames are included only when `stackTrace` is true.

## Related
- [GraphQL request lifecycle](graphql-request-lifecycle.md): the same auth model through mercurius directives.
- [Plugin registration order](plugin-registration-order.md)

[^config-plugin]: `fastify.addHook("onRequest", ...)` sets `request.config = config`.
[^slonik-connect]: Guarded by `hasRequestDecorator`, so it is installed once.
[^slonik-plugin]: `fastify.decorateRequest("dbSchema", "")`. A repo-wide search found no assignment outside tests.
[^base-service-schema]: `get schema()` returns `this._schema || "public"`, and the constructor only overrides for a truthy schema.
[^s3-multipart]: `limits.fileSize: options.fileSizeLimitInBytes || Infinity`; `onFile` sets `part.value = { data: await part.toBuffer(), ... }`.
[^upload-transport]: Multipart on the graphql path sets `req.graphqlFileUploadMultipart`; elsewhere busboy parses it; any other type calls `done(null)`.
[^user-plugin-test-schema]: Test comment: route schemas reference "ErrorResponse#", which error-handler registers in production.
[^session-config]: `getTokenTransferMethod`, plus `override.apis.verifySession` and `override.functions.{createNewSession,getGlobalClaimValidators,getSession}`.
[^get-session]: Sets `input.userContext._default.request.request.user = user`.
[^verify-session]: `session.revokeSession()`, then throws "User not found" or "User is disabled".
[^global-claims]: Returns `claimValidatorsAddedByOtherRecipes` plus `ProfileValidationClaim().validators.isVerified()`.
[^users-controller]: `GET/PUT /me` filter both claims; `GET /users` chains `verifySession()` and `hasPermission(PERMISSIONS_USERS_LIST)`.
[^has-permission]: The comment says "this error tells SuperTokens to return a 403 http response".
[^add-user-device]: The firebase `addUserDevice` handler, which CLAUDE.md names as the canonical slice.
[^base-service-create]: `preProcess("create", data)` → `getCreateSql` → `connection.query` → `postProcess("create", row)`.
[^client-config]: `interceptors: [fieldNameCaseConverter, resultParser, ...(queryLogging ? [logging] : []), ...config.interceptors]`.
[^st-plugin]: Error handler installed unless `setErrorHandler === false`; the `onSend` hook rewrites the refresh-token cookie path.
[^error-handler-plugin]: `preErrorHandler` runs in try/catch; if `reply.sent`, the default handler is skipped.
[^error-handler]: HttpError branch L67-95, domain map L97-108, masked fallback L110-131.
