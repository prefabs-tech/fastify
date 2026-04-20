<!-- Structured feature inventory — used by automated test generation. Developer docs: see GUIDE.md -->

# @prefabs.tech/fastify-firebase — Features

## Plugin Lifecycle

1. **Enable/disable via config flag** — when `config.firebase.enabled === false`, Firebase initialization and database migrations are skipped entirely. Routes are still registered unless individually disabled.

2. **Automatic database migrations** — on registration (when enabled), runs `CREATE TABLE IF NOT EXISTS` for the user devices table, including a composite index on `(user_id, device_token)`.

3. **Firebase initialization with private key normalization** — initializes `firebase-admin` using credentials from `config.firebase.credentials`, replacing literal `\n` escape sequences in `privateKey` with actual newlines before passing to the SDK.

4. **Skip re-initialization guard** — if `admin.apps.length > 0`, `initializeFirebase` returns early without calling `admin.initializeApp` again.

5. **Missing credentials guard** — when `enabled !== false` and `config.firebase.credentials` is absent, logs an error and returns instead of throwing.

## Route Registration

6. **Conditional userDevice routes** — POST `/user-device` and DELETE `/user-device` routes are registered by default; set `config.firebase.routes.userDevices.disabled = true` to skip registration entirely.

7. **Conditional notification test route** — the test-notification route is only registered when `config.firebase.notification.test.enabled === true`.

8. **Configurable route prefix** — all routes are registered under `config.firebase.routePrefix`.

9. **Configurable notification test path** — the notification test route uses `config.firebase.notification.test.path` when set, falling back to the constant `/send-notification`.

10. **Custom handler overrides** — default route handlers can be replaced per-handler via config:
    ```typescript
    config.firebase.handlers = {
      notification: { sendNotification: myNotificationHandler },
      userDevice: {
        addUserDevice: myAddHandler,
        removeUserDevice: myRemoveHandler,
      },
    };
    ```

## Middleware

11. **`isFirebaseEnabled` preHandler** — a reusable preHandler factory that throws a `404 notFound` error when `config.firebase.enabled === false`; applied to all firebase routes automatically.

## HTTP Route Handlers

12. **`POST /user-device` — register a device** — requires an authenticated session (`verifySession`); throws `401 unauthorized` when `request.user` is absent; creates a device record linked to the authenticated user's ID.

13. **`DELETE /user-device` — remove a device** — requires an authenticated session; throws `401` when unauthenticated, `404` when the user has no registered devices, `422` when the device is not owned by the requesting user.

14. **`POST <notification.test.path>` — test push notification** — only registered when `notification.test.enabled = true`; requires authentication; throws `422` when the receiver has no registered devices; sends a multicast FCM message with Android high-priority and APNS sound settings included.

## Database

15. **Configurable user devices table name** — `config.firebase.table.userDevices.name` overrides the default table name `user_devices` at both migration time and query time.

16. **`UserDeviceService.getByUserId`** — queries all device records for a given `userId`.

17. **`UserDeviceService.removeByDeviceToken`** — deletes a device record by token (returning the deleted row).

18. **Device token deduplication on create** — `UserDeviceService.preCreate` calls `removeByDeviceToken` before inserting, ensuring each device token is stored only once regardless of which user previously registered it.

## GraphQL

19. **`firebaseSchema` export** — a merged GraphQL type-definitions document combining the base schema, notification schema, and user device schema; ready to pass to mercurius.

20. **`sendNotification` GraphQL mutation** — `@auth`-protected; returns `401` when unauthenticated, `404` when firebase is disabled, `400` when `userId` is missing, `404` when the receiver has no registered devices, `500` on unexpected errors.

21. **`addUserDevice` GraphQL mutation** — `@auth`-protected; returns `404` when firebase is disabled, `401` when unauthenticated, `500` on unexpected errors.

22. **`removeUserDevice` GraphQL mutation** — `@auth`-protected; returns `404` when firebase is disabled, `401` when unauthenticated, `403` when the user has no registered devices, `403` when the device is not owned by the requesting user.

## Utility Functions

23. **`sendPushNotification`** — thin wrapper around `firebase-admin` `messaging().sendEachForMulticast(message)`; accepts a `MulticastMessage` and returns a promise.

24. **`initializeFirebase`** — exported utility that initializes the `firebase-admin` app from `ApiConfig`; handles private key normalization, re-init guard, and credential-missing guard.

## Module Augmentations

25. **`FastifyInstance.verifySession`** — declares `verifySession` (from `supertokens-node`) on the Fastify instance interface.

26. **`FastifyRequest.user`** — declares an optional `user: User` property on all Fastify requests.

27. **`MercuriusContext.user`** — declares a required `user: User` property on the Mercurius context interface.

28. **`ApiConfig.firebase`** — extends `@prefabs.tech/fastify-config`'s `ApiConfig` with the full `firebase` configuration block (credentials, enabled, handlers, notification, routePrefix, routes, table).

## Type Exports

29. **`User`** — `{ id: string }`.

30. **`UserDevice`** — `{ userId, deviceToken, createdAt, updatedAt }`.

31. **`UserDeviceCreateInput`** — partial of `UserDevice` excluding timestamps.

32. **`UserDeviceUpdateInput`** — partial of `UserDevice` excluding timestamps and `userId`.

33. **`TestNotificationInput`** — `{ userId, title, body, data? }`.

## Constants

34. **Exported route and table constants** — `ROUTE_SEND_NOTIFICATION` (`/send-notification`), `ROUTE_USER_DEVICE_ADD` (`/user-device`), `ROUTE_USER_DEVICE_REMOVE` (`/user-device`), `TABLE_USER_DEVICES` (`user_devices`).

## Migration Queries

35. **`createUserDevicesTableQuery` export** — exported SQL factory function for the user devices table DDL; uses the configured or default table name.

## Initialization and Route Guards

36. **Initialization failure logging** — if `firebase-admin` initialization throws, `initializeFirebase` catches the error and logs both a fixed message (`"Failed to initialize firebase"`) and the original error object instead of crashing startup.

37. **Explicit notification route disable flag** — even when `config.firebase.notification.test.enabled === true`, setting `config.firebase.routes.notifications.disabled = true` prevents notification route registration entirely.
