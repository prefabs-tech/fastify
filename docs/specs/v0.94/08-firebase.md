# 08 — `@prefabs.tech/fastify-firebase`

Firebase Admin initialisation, a device-token registry, multicast push
notifications, and an App Check verification hook.

Peers: `@prefabs.tech/fastify-config`, `@prefabs.tech/fastify-error-handler`,
`@prefabs.tech/fastify-graphql`, `@prefabs.tech/fastify-slonik`, `fastify`,
`fastify-plugin`, `mercurius`, `slonik`. Bundles `firebase-admin` and `zod`.

This package is **configuration-only** — it takes no plugin options and reads
`fastify.config.firebase`. Register it after slonik and after whatever
decorates `verifySession` (in this monorepo, `@prefabs.tech/fastify-user`),
because its controllers call `fastify.verifySession()` at route-registration
time.

It does **not** depend on SuperTokens. It declares `verifySession` and
`request.user` as host-provided, so any auth plugin that decorates a
`verifySession` factory and populates `request.user` with an `{ id }` satisfies
it.

## Configuration

```typescript
config.firebase = {
  appCheck: {
    enabled: true,
    routes: ["/api/orders", "/api/checkout"],
  },
  credentials: {
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    projectId: process.env.FIREBASE_PROJECT_ID,
  },
  enabled: true,
  handlers: {
    notification: { sendNotification: myHandler },
    userDevice: { addUserDevice: myHandler, removeUserDevice: myHandler },
  },
  notification: { test: { enabled: false, path: "/send-notification" } },
  routePrefix: "/api",
  routes: {
    notifications: { disabled: false },
    userDevices: { disabled: false },
  },
  table: { userDevices: { name: "user_devices" } },
};
```

| Key | Effect |
|---|---|
| `enabled` | `=== false` skips Admin init **and** migrations. Routes are still registered, but every one of them answers 404 |
| `credentials` | `clientEmail`, `privateKey`, `projectId` for the service account |
| `routePrefix` | Prefix for both route groups |
| `routes.<group>.disabled` | Skips registering that group entirely |
| `notification.test` | `{ enabled, path }` — the test push route, off unless `enabled` is true |
| `handlers` | Per-handler override slots |
| `table.userDevices.name` | Table name, at migration and query time |
| `appCheck` | `{ enabled, routes }` for the exported hook — opt-**in** |

### Two levels of "off"

`enabled: false` and `routes.*.disabled: true` are not the same:

- `enabled: false` — no Admin SDK, no migration. Routes still register, and the
  `isFirebaseEnabled` preHandler throws `404 Firebase is disabled` on each.
- `routes.userDevices.disabled: true` — those routes never exist; requests get
  Fastify's own 404.

Setting `notification.test.enabled: true` but `routes.notifications.disabled:
true` still registers nothing — the group flag wins.

## Initialisation

`initializeFirebase` normalises the private key, replacing literal `\n`
sequences with real newlines — which is what makes a key stored in a single
environment-variable line work.

Two guards, both non-fatal: if `admin.apps.length > 0` it returns without
re-initialising; if credentials are missing while enabled it logs
`Firebase credentials are missing` and returns. An SDK throw during
`initializeApp` is caught and logged as `Failed to initialize firebase`.

**Boot never fails on a Firebase misconfiguration.** The failure surfaces later,
as a runtime error on the first `messaging()` call. Check your logs at startup.

## Routes

Registered under `routePrefix`, each guarded by
`[fastify.verifySession(), isFirebaseEnabled(fastify)]`.

| Method | Path | Handler | Override slot |
|---|---|---|---|
| POST | `/user-device` | register a device token | `handlers.userDevice.addUserDevice` |
| DELETE | `/user-device` | remove a device token | `handlers.userDevice.removeUserDevice` |
| POST | `notification.test.path` (default `/send-notification`) | test push | `handlers.notification.sendNotification` |

Body for both device routes: `{ deviceToken: string }`. Test push body:
`{ userId, title, body, data? }`.

Status codes, from the handlers: `401` when `request.user` is absent; on
delete, `404` when the user has no devices and `422` when the token is not
theirs; on test push, `422` when the *receiver* has no devices.

The test route builds a `MulticastMessage` with Android `priority: "high"` and
`sound: "default"`, and APNS `sound: "default"`, then calls
`sendEachForMulticast`.

## Device registry

`UserDeviceService` extends `BaseService`, adding:

| Method | Behaviour |
|---|---|
| `getByUserId(userId)` | All device rows for a user |
| `removeByDeviceToken(token)` | Deletes by token, returning the deleted row |

Its `preCreate` hook calls `removeByDeviceToken` before every insert, so a
token is stored once globally — re-registering a device that changed hands
moves it to the new user rather than duplicating it.

## App Check

`verifyFirebaseAppCheck` is exported but **not registered by the plugin**. Wire
it yourself:

```typescript
import { verifyFirebaseAppCheck } from "@prefabs.tech/fastify-firebase";

api.addHook("onRequest", verifyFirebaseAppCheck);
```

Behaviour:

- Returns early when `config.firebase.appCheck.enabled` is falsy. This flag is
  opt-**in**, unlike the repo-wide `=== false` convention.
- Returns early when the request path — query string stripped — is not in
  `appCheck.routes`. **An absent or empty `routes` array protects nothing.**
- Replies `403 { code: "FORBIDDEN" }` when the `x-firebase-appcheck` header is
  missing or supplied more than once.
- Replies `403` and logs when `getAppCheck().verifyToken(...)` rejects.

Paths are matched exactly, against the raw URL — not against route patterns. A
parameterised route has to be listed per concrete path, or guarded another way.

## GraphQL

`firebaseSchema` is the merged document (base + notification + user device).
Mutations, all `@auth`-protected: `sendNotification`, `addUserDevice`,
`removeUserDevice`. Resolvers are exported individually as
`notificationResolver` and `userDeviceResolver`. See
[chapter 12](12-graphql-api-reference.md).

## Exports

| Export | Kind |
|---|---|
| `default` | the plugin |
| `UserDeviceService` | service class |
| `firebaseSchema` | merged SDL document |
| `notificationRoutes`, `userDeviceRoutes` | controllers |
| `notificationResolver`, `userDeviceResolver` | resolvers |
| `verifyFirebaseAppCheck` | `onRequest` hook |
| `initializeFirebase`, `sendPushNotification`, `firebaseAdmin` | libs |
| `getAppCheck` | re-export from `firebase-admin/app-check` |
| `createUserDevicesTableQuery` | migration query factory |
| `ROUTE_SEND_NOTIFICATION`, `ROUTE_USER_DEVICE_ADD`, `ROUTE_USER_DEVICE_REMOVE`, `TABLE_USER_DEVICES` | constants |
| `User`, `UserDevice`, `UserDeviceCreateInput`, `UserDeviceUpdateInput`, `TestNotificationInput` | types |

`firebaseAdmin` is the same module instance the plugin initialises, so
`firebaseAdmin.auth()`, `.firestore()`, and `.messaging()` are available
without declaring a direct `firebase-admin` dependency.
