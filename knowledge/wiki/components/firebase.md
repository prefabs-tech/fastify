---
type: Component
title: fastify-firebase
description: The push notification package, providing firebase-admin initialization, a user_devices table mapping FCM tokens to users, device REST and GraphQL endpoints, an optional test-notification route, and an opt-in App Check middleware.
tags: [firebase, fcm, push-notifications, app-check, package]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: index
    resource: repo://packages/firebase/src/index.ts#L8-L86
    title: Augmentations, config shape, exports
  - id: plugin
    resource: repo://packages/firebase/src/plugin.ts#L10-L34
    title: Plugin
  - id: init
    resource: repo://packages/firebase/src/lib/initializeFirebase.ts#L6-L35
    title: initializeFirebase
  - id: is-enabled
    resource: repo://packages/firebase/src/middlewares/isFirebaseEnabled.ts#L3-L10
    title: isFirebaseEnabled preHandler
  - id: app-check
    resource: repo://packages/firebase/src/middlewares/verifyFirebaseAppCheck.ts#L5-L40
    title: verifyFirebaseAppCheck
  - id: queries
    resource: repo://packages/firebase/src/migrations/queries.ts#L9-L33
    title: user_devices DDL
  - id: device-controller
    resource: repo://packages/firebase/src/model/userDevice/controller.ts#L11-L33
    title: Device routes
  - id: device-service
    resource: repo://packages/firebase/src/model/userDevice/service.ts#L10-L54
    title: UserDeviceService
  - id: notification-controller
    resource: repo://packages/firebase/src/model/notification/controller.ts#L8-L28
    title: Test notification route
  - id: send-notification
    resource: repo://packages/firebase/src/model/notification/handlers/sendNotification.ts#L9-L73
    title: Test notification handler
  - id: device-resolver
    resource: repo://packages/firebase/src/model/userDevice/graphql/resolver.ts#L5-L98
    title: Device GraphQL resolvers
  - id: guide-auth
    resource: repo://packages/firebase/GUIDE.md#L86-L90
    title: GUIDE, auth prerequisite
  - id: vite
    resource: repo://packages/firebase/vite.config.ts
    title: Regex external for firebase-admin subpaths
  - id: commit-decouple
    resource: repo://packages/firebase/src/index.ts
    title: "Commit 4191a544, 2026-08-04: feat(firebase): decouple package from supertokens (#1118)"
  - id: claude-md
    resource: repo://CLAUDE.md
    title: Firebase named as canonical reference package
---

# fastify-firebase

**Responsibility:** register device tokens per user and send FCM push notifications through firebase-admin. It does not authenticate; the host app supplies that.

CLAUDE.md names this package the canonical reference for anatomy, tests and FEATURES.md.[^claude-md]

## Registration (reads `fastify.config.firebase` only)
- **If `enabled !== false`:** run the `user_devices` migration, then `initializeFirebase`.[^plugin]
- **Regardless of `enabled`:** register the notification and user-device controllers under `routePrefix`, unless `routes.notifications.disabled` or `routes.userDevices.disabled` is set.[^plugin] When firebase is disabled those routes still exist, but every one of them answers **404** through the `isFirebaseEnabled` preHandler.[^is-enabled]

### `initializeFirebase`
- A no-op when a firebase-admin app already exists.
- With credentials missing, or when `initializeApp` throws, it **logs and returns**. Boot continues.[^init]
  > Inference: messaging calls would then fail at send time rather than at boot.
- `privateKey` has literal `\n` sequences replaced with newlines, so a key taken from an environment variable works.[^init]

## Auth contract
Every REST route uses `[fastify.verifySession(), isFirebaseEnabled(fastify)]` and handlers require `request.user.id`.[^device-controller] The package augments the `verifySession` and `request.user` **types** but implements neither. The host must register an auth plugin first; in this monorepo that is [user](user.md).[^guide-auth][^index] The explicit SuperTokens dependency was removed in commit `4191a544`.[^commit-decouple]

## Data: `user_devices`
Columns `id`, `user_id`, `device_token`, `created_at`, `updated_at`, with an index on `(user_id, device_token)`, all created inside a `DO $$ ... $$` block.[^queries]

`UserDeviceService.preCreate` **deletes any existing row with the same `device_token`** before inserting. A token therefore belongs to exactly one user: the most recent one to register it.[^device-service]

## Endpoints
| Surface | Operation | Rules |
|---------|-----------|-------|
| REST `POST /user-device` | add device for the current user | session; firebase enabled |
| REST `DELETE /user-device` | remove device | session; firebase enabled |
| REST `POST notification.test.path` (default `/send-notification`) | send a multicast notification to every device of `userId` | **only registered when `notification.test.enabled`**; session; 422 if the receiver has no devices[^notification-controller][^send-notification] |
| GraphQL `addUserDevice` / `removeUserDevice` | same as REST | returns `ErrorWithProps`: 404 when disabled, 401 without a user, 403 when the token is not owned by the caller[^device-resolver] |

Each REST handler can be replaced through `config.firebase.handlers.{userDevice,notification}.*`.

## App Check (opt-in)
`verifyFirebaseAppCheck` is exported but **not registered**; the app adds it as a hook. It acts only when `firebase.appCheck.enabled` is set and the request path, with the query string removed, **exactly matches** an entry in `appCheck.routes`. It returns 403 `FORBIDDEN` when the `x-firebase-appcheck` header is missing or fails verification.[^app-check]

## Build note
`firebase-admin/app-check` is a subpath import, so the Vite config externalizes `/^firebase-admin\//`. Without it the subpath would be bundled into `dist/`.[^vite] See [Build graph](../architecture/build-graph.md).

## Tests
`plugin.test.ts`, `controllers.test.ts`, `handlers.test.ts`, `service.test.ts` (pg-mem), `sqlFactory.test.ts`, `queries.test.ts`, `initializeFirebase.test.ts`, `isFirebaseEnabled.test.ts`, both resolver tests, and `libraryAndMigrations.test.ts`. `plugin.test.ts` holds the `buildFastify` helper that CLAUDE.md tells new suites to copy.

[^index]: The config shape is augmented at L26-70; `verifySession` and `request.user` are typed at L8-18.
[^plugin]: L13-21 migrations and init; L23-31 route registration outside the enabled branch.
[^is-enabled]: `throw fastify.httpErrors.notFound("Firebase is disabled")`.
[^init]: Missing credentials L11-14; try/catch L16-30.
[^queries]: Table name from `config.firebase.table.userDevices.name` or `user_devices`.
[^device-service]: `preCreate` calls `removeByDeviceToken(deviceToken)`.
[^device-controller]: Also shows the handler override slot `handlersConfig?.addUserDevice || handlers.addUserDevice`.
[^notification-controller]: `if (notificationConfig?.test?.enabled)`.
[^send-notification]: Builds a `MulticastMessage` with Android high priority and default sound.
[^device-resolver]: `removeUserDevice` checks the token belongs to one of the caller's devices.
[^guide-auth]: "the host application must register an auth plugin that decorates `verifySession` and populates `request.user`".
[^app-check]: `PROTECTED_ROUTES.has(request.url.split("?", 1)[0])`.
[^vite]: Comment in the externals list.
[^commit-decouple]: Commit 4191a544.
[^claude-md]: "Reference suites: `packages/firebase/src/__test__/` and `packages/swagger`".
