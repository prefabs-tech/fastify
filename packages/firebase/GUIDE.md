# @prefabs.tech/fastify-firebase — Developer Guide

## Installation

### For package consumers (npm + pnpm)

```bash
# npm
npm install @prefabs.tech/fastify-firebase firebase-admin fastify fastify-plugin

# pnpm
pnpm add @prefabs.tech/fastify-firebase firebase-admin fastify fastify-plugin
```

Peer dependencies that must also be installed:

```bash
pnpm add @prefabs.tech/fastify-config \
         @prefabs.tech/fastify-error-handler \
         @prefabs.tech/fastify-graphql \
         @prefabs.tech/fastify-slonik \
         mercurius \
         slonik \
         supertokens-node
```

### For monorepo development (pnpm install / test / build)

```bash
# From the repo root — install all workspaces
pnpm install

# Run tests for this package only
pnpm --filter @prefabs.tech/fastify-firebase test

# Build
pnpm --filter @prefabs.tech/fastify-firebase build
```

## Setup

Register the plugin once. All later examples assume this configuration is in place.

```typescript
import Fastify from "fastify";
import firebasePlugin from "@prefabs.tech/fastify-firebase";

// @prefabs.tech/fastify-config, @prefabs.tech/fastify-slonik, and
// @prefabs.tech/fastify-error-handler must be registered before this plugin.
const app = Fastify();

await app.register(firebasePlugin);

// The plugin reads all settings from app.config.firebase (injected by
// @prefabs.tech/fastify-config). A minimal configuration looks like:
//
// config.firebase = {
//   enabled: true,
//   credentials: {
//     clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
//     privateKey: process.env.FIREBASE_PRIVATE_KEY!,   // \n escapes are normalized automatically
//     projectId: process.env.FIREBASE_PROJECT_ID!,
//   },
//   routePrefix: "/api",
// };
```

---

## Base Libraries

### `firebase-admin` — Partial Passthrough

**Their docs:** https://www.npmjs.com/package/firebase-admin

We initialize `firebase-admin` internally via `initializeFirebase` and expose a single wrapper (`sendPushNotification`) over `messaging().sendEachForMulticast`. The rest of the `firebase-admin` surface area (Auth, Firestore, Storage, etc.) is not wrapped; call `firebase-admin` directly in your application code for those services.

What we add on top:

- Private-key `\n` normalization before calling `admin.initializeApp`.
- Re-initialization guard (`admin.apps.length > 0`).
- Missing-credentials guard with structured error logging instead of a thrown exception.
- `sendPushNotification` — a typed async wrapper around multicast messaging.

### `supertokens-node` — Partial Passthrough

**Their docs:** https://www.npmjs.com/package/supertokens-node

We use `verifySession` from `supertokens-node/recipe/session/framework/fastify` as a preHandler on every route. We do not wrap or re-export the supertokens initialization; you must configure SuperTokens in your application before registering this plugin.

What we add on top:

- `FastifyInstance.verifySession` module augmentation so the decorator is typed everywhere.
- `FastifyRequest.user` module augmentation (`{ id: string }`) populated by your application's session middleware.

### `fastify-plugin` — Full Passthrough

**Their docs:** https://www.npmjs.com/package/fastify-plugin

Used internally to ensure the plugin does not create a new Fastify scope (decorators registered by peer plugins remain visible). Not re-exported.

### `slonik` — Partial Passthrough

**Their docs:** https://www.npmjs.com/package/slonik

Used internally for all database access via `@prefabs.tech/fastify-slonik`'s `BaseService` / `DefaultSqlFactory`. We expose `createUserDevicesTableQuery` for consumers who manage their own migration pipeline.

### `mercurius` — Partial Passthrough

**Their docs:** https://www.npmjs.com/package/mercurius

GraphQL resolvers use `mercurius.ErrorWithProps` for structured error responses and read `MercuriusContext`. We add a `MercuriusContext.user` augmentation and export `firebaseSchema`, `notificationResolver`, and `userDeviceResolver` for consumption by your Mercurius setup.

---

## Features

### 1. Enable / disable via config flag

Set `config.firebase.enabled = false` to skip Firebase initialization and database migrations while keeping the plugin registered. Routes are still registered unless also disabled.

```typescript
// config.firebase.enabled = false
// → initializeFirebase is NOT called
// → runMigrations is NOT called
// → routes are registered but all respond with 404 (isFirebaseEnabled preHandler)
```

### 2. Automatic database migrations

On plugin registration (when `enabled !== false`) the plugin runs `CREATE TABLE IF NOT EXISTS user_devices` with a composite index on `(user_id, device_token)`. No manual migration step is needed.

```typescript
// Nothing to call — happens automatically inside plugin registration.
// To inspect the generated SQL, import the query factory directly:
import { createUserDevicesTableQuery } from "@prefabs.tech/fastify-firebase";

const query = createUserDevicesTableQuery(config);
// query is a Slonik QuerySqlToken ready to execute
```

### 3. Firebase initialization with private key normalization

`initializeFirebase` replaces literal `\n` in `privateKey` with actual newline characters before calling `admin.initializeApp`. This allows the raw value from an environment variable (where newlines are often stored as `\n`) to be passed directly.

```typescript
import { initializeFirebase } from "@prefabs.tech/fastify-firebase";

// Called automatically by the plugin, but can also be called manually:
initializeFirebase(config, fastify);
// If admin.apps.length > 0, this is a no-op.
// If credentials are missing, logs an error and returns without throwing.
```

### 4. Skip re-initialization guard

`initializeFirebase` checks `admin.apps.length > 0` and returns early if Firebase is already initialized. This makes the function safe to call multiple times in test environments or multi-registration scenarios.

### 5. Missing credentials guard

If `enabled !== false` and `config.firebase.credentials` is `undefined`, `initializeFirebase` logs `"Firebase credentials are missing"` at the error level and returns without throwing, preventing an uncaught exception during startup.

### 6. Conditional userDevice routes

POST `/user-device` and DELETE `/user-device` are registered by default. Disable them:

```typescript
// In your ApiConfig:
config.firebase.routes = {
  userDevices: { disabled: true },
};
```

### 7. Conditional notification test route

The test-notification route is only registered when explicitly enabled:

```typescript
config.firebase.notification = {
  test: {
    enabled: true,
    path: "/test/send-notification", // optional; defaults to /send-notification
  },
};
```

### 8. Configurable route prefix

All routes are mounted under the prefix you configure:

```typescript
config.firebase.routePrefix = "/api/v1";
// Results in: POST /api/v1/user-device, DELETE /api/v1/user-device, etc.
```

### 9. Configurable notification test path

When the notification test route is enabled, its path defaults to `/send-notification` but can be overridden:

```typescript
config.firebase.notification = {
  test: {
    enabled: true,
    path: "/internal/push-test",
  },
};
```

### 10. Custom handler overrides

Replace any default route handler with your own implementation:

```typescript
import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify";

const myAddHandler = async (request: SessionRequest, reply: FastifyReply) => {
  // custom logic
  reply.send({ ok: true });
};

config.firebase.handlers = {
  userDevice: {
    addUserDevice: myAddHandler,
    removeUserDevice: myRemoveHandler,
  },
  notification: {
    sendNotification: myNotificationHandler,
  },
};
```

### 11. `isFirebaseEnabled` preHandler

A preHandler factory that throws a Fastify `404 notFound` error if `config.firebase.enabled === false`. It is applied automatically to all firebase routes. You can also apply it to your own routes:

```typescript
import isFirebaseEnabled from "@prefabs.tech/fastify-firebase/middlewares/isFirebaseEnabled";
// (consume via plugin registration — not a public export; shown for illustration)

fastify.get(
  "/my-route",
  {
    preHandler: [isFirebaseEnabled(fastify)],
  },
  handler,
);
```

### 12. `POST /user-device` — register a device token

Requires a valid SuperTokens session. Associates the authenticated user's ID with a device token. Deduplicates automatically — if the token is already registered to another user, it is removed first.

```typescript
// POST /user-device
// Headers: Cookie: sAccessToken=...
// Body:
{ "deviceToken": "fcm-token-abc123" }

// 200 response:
{
  "userId": "user-uuid",
  "deviceToken": "fcm-token-abc123",
  "createdAt": 1712345678,
  "updatedAt": 1712345678
}
// 401 — unauthenticated
// 404 — firebase disabled
```

### 13. `DELETE /user-device` — remove a device token

Requires authentication. Validates that the device token belongs to the requesting user before deleting.

```typescript
// DELETE /user-device
// Headers: Cookie: sAccessToken=...
// Body:
{ "deviceToken": "fcm-token-abc123" }

// 200 — returns the deleted UserDevice record (or null)
// 401 — unauthenticated
// 404 — user has no registered devices
// 422 — device not owned by requesting user
// 404 — firebase disabled
```

### 14. `POST <notification.test.path>` — test push notification

Only registered when `config.firebase.notification.test.enabled = true`. Sends a multicast FCM message with Android high-priority and APNS default-sound settings to all devices registered for the target user.

```typescript
// POST /send-notification (or your configured test path)
// Headers: Cookie: sAccessToken=...
// Body:
{
  "userId": "target-user-uuid",
  "title": "Hello",
  "message": "World",
}

// 200: { "message": "Notification sent successfully" }
// 401 — unauthenticated
// 422 — receiver has no registered devices
// 404 — firebase disabled
```

### 15. Configurable user devices table name

Override the default `user_devices` table name for both migrations and all queries:

```typescript
config.firebase.table = {
  userDevices: { name: "custom_user_devices" },
};
```

### 16 & 17. `UserDeviceService.getByUserId` / `removeByDeviceToken`

```typescript
import UserDeviceService from "@prefabs.tech/fastify-firebase";

const service = new UserDeviceService(config, database, dbSchema);

// Get all devices for a user
const devices = await service.getByUserId("user-uuid");
// → UserDevice[] | undefined

// Remove a device by token (returns the deleted row)
const removed = await service.removeByDeviceToken("fcm-token-abc123");
// → UserDevice | undefined
```

### 18. Device token deduplication on create

`UserDeviceService.create` (inherited from `BaseService`) calls `preCreate` before inserting. `preCreate` removes any existing row with the same `deviceToken`. This means each FCM token can only be associated with one user at a time.

```typescript
const service = new UserDeviceService(config, database, dbSchema);

// If "fcm-token-abc" is already registered to user A, this call first
// deletes that row then inserts a new one for user B:
await service.create({ deviceToken: "fcm-token-abc", userId: "user-b" });
```

### 19. `firebaseSchema` export

A merged GraphQL SDL document combining the base schema, notification types, and user device types. Pass it to Mercurius alongside your resolvers.

```typescript
import {
  firebaseSchema,
  notificationResolver,
  userDeviceResolver,
} from "@prefabs.tech/fastify-firebase";
import { mergeResolvers } from "@prefabs.tech/fastify-graphql";

// In your Mercurius setup:
await app.register(mercurius, {
  schema: firebaseSchema,
  resolvers: mergeResolvers([notificationResolver, userDeviceResolver]),
});
```

### 20. `sendNotification` GraphQL mutation

```graphql
mutation {
  sendNotification(
    data: {
      userId: "target-user-uuid"
      title: "New message"
      body: "You have a new message"
    }
  ) {
    message
  }
}
```

Error codes returned as `mercurius.ErrorWithProps`:

- `401` — unauthenticated (`context.user` is absent)
- `404` — firebase disabled
- `400` — `userId` not provided
- `404` — receiver has no registered devices
- `500` — unexpected error

### 21. `addUserDevice` GraphQL mutation

```graphql
mutation {
  addUserDevice(data: { deviceToken: "fcm-token-xyz" }) {
    id
    userId
    deviceToken
    createdAt
    updatedAt
  }
}
```

Error codes: `404` firebase disabled, `401` unauthenticated, `500` unexpected.

### 22. `removeUserDevice` GraphQL mutation

```graphql
mutation {
  removeUserDevice(data: { deviceToken: "fcm-token-xyz" }) {
    id
    userId
    deviceToken
  }
}
```

Error codes: `404` firebase disabled, `401` unauthenticated, `403` user has no devices, `403` device not owned by user.

### 23. `sendPushNotification` utility

Sends a Firebase multicast message. Accepts the full `MulticastMessage` type from `firebase-admin`.

```typescript
import { sendPushNotification } from "@prefabs.tech/fastify-firebase";
import type { MulticastMessage } from "firebase-admin/lib/messaging/messaging-api";

const message: MulticastMessage = {
  tokens: ["token-a", "token-b"],
  notification: { title: "Alert", body: "Something happened" },
  data: { orderId: "42" },
};

await sendPushNotification(message);
```

### 24. `initializeFirebase` utility

```typescript
import { initializeFirebase } from "@prefabs.tech/fastify-firebase";

initializeFirebase(config, fastify);
// No-op if already initialized.
// Logs error (does not throw) if credentials are missing.
```

### 25–28. Module augmentations

The package extends four interfaces automatically on import. No action needed — these give you type safety throughout your application:

```typescript
import "@prefabs.tech/fastify-firebase"; // augmentations applied on import

// fastify.verifySession is now typed
// request.user is now typed as User | undefined
// MercuriusContext.user is now typed as User
// ApiConfig.firebase is now typed with all config options
```

### 29–33. Type exports

```typescript
import type {
  User,
  UserDevice,
  UserDeviceCreateInput,
  UserDeviceUpdateInput,
  TestNotificationInput,
} from "@prefabs.tech/fastify-firebase";
```

| Type                    | Shape                                                               |
| ----------------------- | ------------------------------------------------------------------- |
| `User`                  | `{ id: string }`                                                    |
| `UserDevice`            | `{ userId, deviceToken, createdAt: number, updatedAt: number }`     |
| `UserDeviceCreateInput` | `Partial<Omit<UserDevice, 'createdAt' \| 'updatedAt'>>`             |
| `UserDeviceUpdateInput` | `Partial<Omit<UserDevice, 'createdAt' \| 'updatedAt' \| 'userId'>>` |
| `TestNotificationInput` | `{ userId, title, body, data?: Record<string, string> }`            |

### 34. Route and table constants

```typescript
import {
  ROUTE_SEND_NOTIFICATION, // "/send-notification"
  ROUTE_USER_DEVICE_ADD, // "/user-device"
  ROUTE_USER_DEVICE_REMOVE, // "/user-device"
  TABLE_USER_DEVICES, // "user_devices"
} from "@prefabs.tech/fastify-firebase";
```

### 35. `createUserDevicesTableQuery` export

```typescript
import { createUserDevicesTableQuery } from "@prefabs.tech/fastify-firebase";

const query = createUserDevicesTableQuery(config);
// Returns a Slonik QuerySqlToken for the user_devices DDL.
// Respects config.firebase.table?.userDevices?.name.
```

---

## Use Cases

### Use case 1: Register the plugin and enable FCM push notifications

Full end-to-end setup for a Fastify app that accepts device registrations and sends notifications via REST.

```typescript
import Fastify from "fastify";
import configPlugin from "@prefabs.tech/fastify-config";
import errorHandlerPlugin from "@prefabs.tech/fastify-error-handler";
import slonikPlugin from "@prefabs.tech/fastify-slonik";
import firebasePlugin from "@prefabs.tech/fastify-firebase";

const app = Fastify({ logger: true });

await app.register(configPlugin);
await app.register(errorHandlerPlugin);
await app.register(slonikPlugin);
await app.register(firebasePlugin);

// config.firebase is sourced from ApiConfig (e.g. env vars via @prefabs.tech/fastify-config):
// {
//   enabled: true,
//   credentials: {
//     clientEmail: "svc@project.iam.gserviceaccount.com",
//     privateKey: "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
//     projectId: "my-firebase-project",
//   },
//   routePrefix: "/api",
// }

await app.listen({ port: 3000 });
// Routes now active:
//   POST /api/user-device
//   DELETE /api/user-device
```

### Use case 2: Enable GraphQL mutations for notifications and device management

```typescript
import mercurius from "mercurius";
import {
  firebaseSchema,
  notificationResolver,
  userDeviceResolver,
} from "@prefabs.tech/fastify-firebase";
import { mergeResolvers } from "@prefabs.tech/fastify-graphql";

await app.register(mercurius, {
  schema: firebaseSchema,
  resolvers: mergeResolvers([notificationResolver, userDeviceResolver]),
  context: (request) => ({
    user: request.user, // populated by your session middleware
    config: app.config,
    database: app.slonik,
    dbSchema: app.dbSchema,
    app,
  }),
});
```

### Use case 3: Send a push notification from application code

```typescript
import { sendPushNotification } from "@prefabs.tech/fastify-firebase";
import UserDeviceService from "@prefabs.tech/fastify-firebase";
import type { MulticastMessage } from "firebase-admin/lib/messaging/messaging-api";

async function notifyUser(
  config: ApiConfig,
  database: Database,
  dbSchema: string,
  userId: string,
  title: string,
  body: string,
) {
  const service = new UserDeviceService(config, database, dbSchema);
  const devices = await service.getByUserId(userId);

  if (!devices || devices.length === 0) {
    return; // user has no registered devices
  }

  const message: MulticastMessage = {
    tokens: devices.map((d) => d.deviceToken),
    notification: { title, body },
  };

  await sendPushNotification(message);
}
```

### Use case 4: Disable specific routes and override a handler

```typescript
// Disable device routes; use only GraphQL for device management.
// Override the notification handler with custom logic.
import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify";

const customSendNotification = async (
  request: SessionRequest,
  reply: FastifyReply,
) => {
  // custom auditing, rate limiting, etc.
  const { userId, title, message } = request.body as {
    userId: string;
    title: string;
    message: string;
  };
  // ... custom logic ...
  reply.send({ success: true, message: "sent" });
};

// In your ApiConfig:
// config.firebase.routes = { userDevices: { disabled: true } };
// config.firebase.handlers = { notification: { sendNotification: customSendNotification } };
```

### Use case 5: Run with Firebase disabled (feature flag)

Keep the plugin registered but prevent all Firebase activity (useful for environments without Firebase credentials):

```typescript
// config.firebase.enabled = false

// Result:
// - initializeFirebase → skipped (no credentials needed)
// - runMigrations → skipped
// - All firebase routes are registered but respond with 404
// - GraphQL mutations return 404
// - sendPushNotification will fail if called directly (no firebase app)
```

### Use case 6: Use a custom table name

```typescript
// config.firebase.table = { userDevices: { name: "mobile_push_devices" } };
// - Migration creates "mobile_push_devices" table (not "user_devices")
// - All UserDeviceService queries target "mobile_push_devices"
// - ROUTE_USER_DEVICE_ADD / TABLE_USER_DEVICES constants are unaffected
//   (they reflect defaults; the runtime table name comes from config)
```
