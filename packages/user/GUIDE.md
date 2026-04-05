# @prefabs.tech/fastify-user — Developer Guide

## Installation

### For package consumers

```bash
npm install @prefabs.tech/fastify-user
```

```bash
pnpm add @prefabs.tech/fastify-user
```

### For monorepo development

```bash
pnpm install
pnpm --filter @prefabs.tech/fastify-user test
pnpm --filter @prefabs.tech/fastify-user build
```

## Setup

This plugin requires several peer plugins registered beforehand. All subsequent examples assume this setup.

```typescript
import Fastify from "fastify";
import cors from "@fastify/cors";
import formbody from "@fastify/formbody";
import configPlugin from "@prefabs.tech/fastify-config";
import errorHandlerPlugin from "@prefabs.tech/fastify-error-handler";
import userPlugin, {
  SUPERTOKENS_CORS_HEADERS,
} from "@prefabs.tech/fastify-user";

const fastify = Fastify();

await fastify.register(configPlugin, {
  config: {
    // ...your ApiConfig...
    user: {
      routePrefix: "/api",
      supertokens: {
        connectionUri: "http://localhost:3567",
        apiBasePath: "/auth",
      },
      roles: ["EDITOR"],
      permissions: ["posts:create", "posts:delete"],
    },
  },
});

await fastify.register(cors, {
  allowedHeaders: SUPERTOKENS_CORS_HEADERS,
  credentials: true,
  origin: true,
});
await fastify.register(formbody);
await fastify.register(errorHandlerPlugin, {
  preErrorHandler: supertokensErrorHandler, // wire in the ST error handler
});

await fastify.register(userPlugin);
```

---

## Base Libraries

### supertokens-node — Modified

Provides authentication sessions, email/password sign-up/in, third-party OAuth, email verification, and role-based access.

→ **Their docs:** [supertokens-node](https://www.npmjs.com/package/supertokens-node)

We wrap `supertokens-node` initialization and expose a subset of its surface via `UserConfig.supertokens`. Recipe configuration can be partially or fully overridden with our merge pattern (see [Recipe overrides](#recipe-overrides)).

**What we add on top:** database integration, user model, invitation flow, profile validation claim, `verifySession` decorator, permission middleware, GraphQL directives.

### mercurius-auth — Modified

Provides `@auth`-style directive authentication for Mercurius/GraphQL.

→ **Their docs:** [mercurius-auth](https://www.npmjs.com/package/mercurius-auth)

We register two separate `mercurius-auth` instances: one for `@auth` and one for `@hasPermission`. Both are registered automatically when `config.graphql.enabled = true`.

**What we add on top:** session verification, email verification enforcement, profile validation enforcement, permission checks, SUPERADMIN bypass — all wired to our user model.

---

## Features

### Plugin registration

On startup the plugin:

1. Initializes SuperTokens and registers the Fastify SuperTokens adapter.
2. Runs `CREATE TABLE IF NOT EXISTS` for the `users` and `invitations` tables (before the server is ready).
3. Seeds built-in roles (`ADMIN`, `SUPERADMIN`, `USER`) plus any extra roles in `config.user.roles` into SuperTokens on `onReady`.
4. Registers four route groups under `config.user.routePrefix`, each independently disable-able.

### Route prefix and selective route disabling

All routes are registered under `config.user.routePrefix`. Any of the four route groups can be disabled:

```typescript
user: {
  routePrefix: "/api",
  routes: {
    invitations: { disabled: true },
    permissions: { disabled: false },
    roles: { disabled: false },
    users: { disabled: false },
  },
}
```

### `fastify.verifySession()` decorator

Protects any route with a SuperTokens session check. Use it as a `preHandler`:

```typescript
fastify.get(
  "/protected",
  {
    preHandler: fastify.verifySession(),
  },
  async (request) => {
    return { userId: request.session!.getUserId() };
  },
);
```

`request.session` (type: `Session`) is populated after this hook runs.

### `request.user` — authenticated user profile

After `verifySession` runs, `request.user` is populated with the full `User` object from the database:

```typescript
fastify.get(
  "/me",
  {
    preHandler: fastify.verifySession(),
  },
  async (request) => {
    return request.user; // User | undefined
  },
);
```

### `fastify.hasPermission(permission)` decorator

Returns a `preHandler` function. Combine with `verifySession` to require both a session and a specific permission:

```typescript
fastify.delete(
  "/posts/:id",
  {
    preHandler: [
      fastify.verifySession(),
      fastify.hasPermission("posts:delete"),
    ],
  },
  handler,
);
```

- Returns `401` if no session.
- Returns `403` if the user lacks the permission.
- `SUPERADMIN` users bypass all permission checks.
- If the permission string is not in `config.user.permissions`, the check passes automatically.

### `hasUserPermission(fastify, userId, permission)` utility

Programmatic boolean permission check, for use outside route preHandlers:

```typescript
import { hasUserPermission } from "@prefabs.tech/fastify-user";

const allowed = await hasUserPermission(fastify, userId, "posts:create");
```

### SuperTokens error handler

By default the plugin calls `fastify.setErrorHandler(supertokensErrorHandler)` automatically. To disable auto-registration and wire it manually (e.g. into `@prefabs.tech/fastify-error-handler`'s `preErrorHandler`):

```typescript
import { supertokensErrorHandler } from "@prefabs.tech/fastify-user";

user: {
  supertokens: {
    setErrorHandler: false, // disable auto-registration
  },
}

// Then wire manually:
await fastify.register(errorHandlerPlugin, {
  preErrorHandler: supertokensErrorHandler,
});
```

### Refresh-token cookie path

An `onSend` hook rewrites the `Path` attribute of the `sRefreshToken` cookie, scoping the refresh token to a specific path:

```typescript
user: {
  supertokens: {
    refreshTokenCookiePath: "/auth/session/refresh",
  },
}
```

Without this option the cookie uses SuperTokens' default path.

### `SUPERTOKENS_CORS_HEADERS` constant

An array of eight header names that must be included in `allowedHeaders` when registering `@fastify/cors` alongside SuperTokens:

```typescript
import { SUPERTOKENS_CORS_HEADERS } from "@prefabs.tech/fastify-user";

await fastify.register(cors, {
  allowedHeaders: SUPERTOKENS_CORS_HEADERS,
  credentials: true,
  origin: true,
});
```

### Recipe overrides

Each SuperTokens recipe can be partially or fully overridden by providing a function `(fastify) => RecipeConfig` under `config.user.supertokens.recipes`. When an object is provided instead, it is merged into the defaults.

```typescript
user: {
  supertokens: {
    recipes: {
      session: (fastify) => ({
        cookieDomain: fastify.config.appOrigin[0],
        cookieSecure: true,
      }),
    },
  },
}
```

For `override.apis` and `override.functions`, provide a function `(originalImpl, fastify) => partialOverride`; only the keys you return are replaced.

### Third-party OAuth providers

Configure Apple, Facebook, GitHub, and Google via `config.user.supertokens.providers`:

```typescript
user: {
  supertokens: {
    providers: {
      google: { clientId: "...", clientSecret: "..." },
      github: { clientId: "...", clientSecret: "..." },
      apple: [{ clientId: "...", keyId: "...", privateKey: "...", teamId: "..." }],
      custom: [myCustomProvider],
    },
  },
}
```

### Email verification (opt-in)

Enable to enforce the email-verified claim on protected routes:

```typescript
user: {
  features: {
    signUp: { emailVerification: true },
  },
}
```

`POST /change-email`, `GET /me`, `PUT /me`, `DELETE /me`, and `PUT/DELETE /me/photo` bypass the email-verification claim so users can still access their account while verifying.

### Profile Validation Claim

A custom SuperTokens session claim that checks required profile fields are populated. Enable and configure required fields:

```typescript
user: {
  features: {
    profileValidation: {
      enabled: true,
      fields: ["photo"], // keyof UserUpdateInput
      gracePeriodInDays: 7, // optional grace window after sign-up
    },
  },
}
```

After the grace period expires, requests to protected routes return `403` with `invalid claim` until the fields are filled. To skip the check on a specific route:

```typescript
fastify.get(
  "/onboarding",
  {
    preHandler: fastify.verifySession({
      overrideGlobalClaimValidators: (validators) =>
        validators.filter((v) => v.id !== ProfileValidationClaim.key),
    }),
  },
  handler,
);
```

### `ProfileValidationClaim` export

Exported for use in custom route preHandlers when you need to reference the claim key directly:

```typescript
import { ProfileValidationClaim } from "@prefabs.tech/fastify-user";

console.log(ProfileValidationClaim.key); // "profileValidation"
```

---

## User Routes

All user routes are registered under `routePrefix`. The session-protected routes require `verifySession()` in their `preHandler`.

| Method   | Path                 | Auth            | Description                           |
| -------- | -------------------- | --------------- | ------------------------------------- |
| `GET`    | `/users`             | `users:list`    | Paginated user list                   |
| `GET`    | `/users/:id`         | `users:read`    | Single user by ID                     |
| `PUT`    | `/users/:id/disable` | `users:disable` | Disable a user                        |
| `PUT`    | `/users/:id/enable`  | `users:enable`  | Enable a user                         |
| `GET`    | `/me`                | session         | Current user's profile                |
| `PUT`    | `/me`                | session         | Update current user's profile         |
| `DELETE` | `/me`                | session         | Soft-delete account + revoke sessions |
| `POST`   | `/change-email`      | session         | Change email address                  |
| `POST`   | `/change_password`   | session         | Change password                       |
| `PUT`    | `/me/photo`          | session         | Upload profile photo (multipart)      |
| `DELETE` | `/me/photo`          | session         | Remove profile photo                  |
| `POST`   | `/signup/admin`      | public          | First-admin sign-up                   |
| `GET`    | `/signup/admin`      | public          | Check admin sign-up availability      |

### Immutable field guard

Before every `PUT /me` update, `filterUserUpdateInput` silently drops any attempt to modify `id`, `email`, `roles`, `lastLoginAt`, `signedUpAt`, `disabled`, `deletedAt`, and their `snake_case` equivalents.

### Profile photo constraints

- Accepted MIME types: `image/jpeg`, `image/png`, `image/webp`
- Default max size: 5 MB (override with `config.user.photoMaxSizeInMB`)
- Stored at `{userId}/photo` in `config.user.s3.bucket`

### Custom handlers

Any route handler can be replaced:

```typescript
user: {
  handlers: {
    user: {
      me: async (request, reply) => { /* custom me handler */ },
      users: async (request, reply) => { /* custom users list */ },
    },
    invitation: {
      createInvitation: async (request, reply) => { /* custom create */ },
    },
  },
}
```

---

## Invitation Routes

| Method   | Path                        | Auth                 | Description                |
| -------- | --------------------------- | -------------------- | -------------------------- |
| `POST`   | `/invitations`              | `invitations:create` | Create and send invitation |
| `GET`    | `/invitations`              | `invitations:list`   | Paginated invitation list  |
| `GET`    | `/invitations/token/:token` | public               | Get invitation by token    |
| `POST`   | `/invitations/token/:token` | public               | Accept invitation          |
| `PUT`    | `/invitations/revoke/:id`   | `invitations:revoke` | Revoke invitation          |
| `POST`   | `/invitations/resend/:id`   | `invitations:resend` | Resend invitation email    |
| `DELETE` | `/invitations/:id`          | `invitations:delete` | Delete invitation record   |

### Invitation configuration

```typescript
user: {
  invitation: {
    expireAfterInDays: 14,          // default: 30
    acceptLinkPath: "/join/:token", // default: "/signup/token/:token"
    postAccept: async (request, invitation, user) => {
      // called after a user successfully accepts an invitation
    },
  },
}
```

### Invitation utilities

```typescript
import {
  isInvitationValid,
  computeInvitationExpiresAt,
  sendInvitation,
  getOrigin,
} from "@prefabs.tech/fastify-user";

// Check if an invitation can still be accepted
isInvitationValid(invitation); // → boolean

// Compute expiry timestamp from config
computeInvitationExpiresAt(config); // uses expireAfterInDays
computeInvitationExpiresAt(config, "2026-06-01T00:00:00.000Z"); // explicit date

// Send invitation email from custom code
await sendInvitation(fastify, invitation, "https://app.example.com");

// Extract origin from a full URL
getOrigin("https://app.example.com/path"); // → "https://app.example.com"
getOrigin("not-a-url"); // → ""
```

---

## Role Routes

| Method   | Path                 | Auth    | Description                          |
| -------- | -------------------- | ------- | ------------------------------------ |
| `POST`   | `/roles`             | session | Create a role                        |
| `DELETE` | `/roles`             | session | Delete a role                        |
| `GET`    | `/roles`             | session | List all roles with permissions      |
| `GET`    | `/roles/permissions` | session | Get permissions for a named role     |
| `PUT`    | `/roles/permissions` | session | Replace permissions for a named role |

### Role utilities

```typescript
import {
  isRoleExists,
  areRolesExist,
  ROLE_ADMIN,
  ROLE_SUPERADMIN,
  ROLE_USER,
} from "@prefabs.tech/fastify-user";

await isRoleExists("EDITOR"); // → boolean
await areRolesExist(["EDITOR", "VIEWER"]); // → boolean (all must exist)
```

---

## Permission Routes

| Method | Path           | Auth    | Description                     |
| ------ | -------------- | ------- | ------------------------------- |
| `GET`  | `/permissions` | session | List all configured permissions |

Register application-specific permissions so they appear in this endpoint:

```typescript
user: {
  permissions: ["posts:create", "posts:delete", "posts:publish"],
}
```

### Built-in permission constants

```typescript
import {
  PERMISSIONS_USERS_LIST,
  PERMISSIONS_USERS_READ,
  PERMISSIONS_USERS_DISABLE,
  PERMISSIONS_USERS_ENABLE,
  PERMISSIONS_INVITATIONS_CREATE,
  PERMISSIONS_INVITATIONS_DELETE,
  PERMISSIONS_INVITATIONS_LIST,
  PERMISSIONS_INVITATIONS_RESEND,
  PERMISSIONS_INVITATIONS_REVOKE,
} from "@prefabs.tech/fastify-user";
```

---

## Email

### Custom email subjects and templates

```typescript
user: {
  emailOverrides: {
    invitation: { subject: "You're invited!", templateName: "my-invitation" },
    resetPassword: { subject: "Reset your password" },
    emailVerification: { templateName: "verify-email-custom" },
  },
}
```

Overridable emails: `invitation`, `resetPassword`, `resetPasswordNotification`, `emailVerification`, `duplicateEmail`.

### `sendEmail` utility

Sends a templated email via `fastify.mailer`. `appName` from config is automatically merged into `templateData`:

```typescript
import { sendEmail } from "@prefabs.tech/fastify-user";

await sendEmail({
  fastify,
  subject: "Welcome!",
  templateName: "welcome",
  to: "user@example.com",
  templateData: { firstName: "Alice" },
});
```

### `verifyEmail` utility

Programmatically marks a user's email as verified (useful for invited users who can skip the verification link):

```typescript
import { verifyEmail } from "@prefabs.tech/fastify-user";

await verifyEmail(userId, userEmail);
```

---

## Validation Utilities

### `validateEmail(email, config)`

Validates an email string against `config.user.email` options. Returns `{ success: true }` or `{ success: false, message }`:

```typescript
import { validateEmail } from "@prefabs.tech/fastify-user";

const result = validateEmail("user@example.com", fastify.config);
if (!result.success) throw new Error(result.message);
```

### Email domain restrictions

```typescript
user: {
  email: {
    host_whitelist: ["example.com"],      // only allow these domains
    host_blacklist: ["tempmail.com"],      // block these domains
  },
}
```

### `validatePassword(password, config)`

Validates password strength. Returns `{ success: true }` or `{ success: false, message }` with a human-readable description of failed requirements:

```typescript
import { validatePassword } from "@prefabs.tech/fastify-user";

const result = validatePassword("MyP@ss1", fastify.config);
// { success: false, message: "Password should contain minimum 8 characters" }
```

### Password strength configuration

```typescript
user: {
  password: {
    minLength: 10,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  },
}
```

---

## Database Utilities

### Migration queries

Exported SQL factory functions for use if you need to run migrations manually or inspect the schema:

```typescript
import {
  createUsersTableQuery,
  createInvitationsTableQuery,
} from "@prefabs.tech/fastify-user";

await db.query(createUsersTableQuery(config));
await db.query(createInvitationsTableQuery(config));
```

### Custom table names

```typescript
user: {
  tables: {
    users: { name: "app_users" },
    invitations: { name: "app_invitations" },
  },
}
```

### Service and SQL factory exports

These classes are exported for direct use in custom service layers:

- `UserService` — database operations for users
- `InvitationService` — database operations for invitations
- `RoleService` — SuperTokens role operations
- `UserSqlFactory` — SQL fragment builder for user queries
- `InvitationSqlFactory` — SQL fragment builder for invitation queries
- `createUserFilterFragment`, `createRoleSortFragment` — reusable Slonik SQL fragments

---

## GraphQL Integration

> Requires `config.graphql.enabled = true` and `@prefabs.tech/fastify-graphql` registered before this plugin.

### Setup

Merge the exported schema and resolvers into your Mercurius setup:

```typescript
import {
  userSchema,
  userResolver,
  invitationResolver,
  roleResolver,
  permissionResolver,
} from "@prefabs.tech/fastify-user";
import { mergeTypeDefs } from "@graphql-tools/merge";

const typeDefs = mergeTypeDefs([userSchema, yourOtherSchema]);
const resolvers = {
  ...userResolver,
  ...invitationResolver,
  ...roleResolver,
  ...permissionResolver,
};
```

### `@auth` directive

Protects a GraphQL field or mutation. Checks: (1) valid session, (2) account not disabled, (3) email verified (if enabled), (4) profile complete (if enabled).

```graphql
type Query {
  dashboard: DashboardData @auth
  profile: User @auth(emailVerification: false, profileValidation: false)
}
```

Pass `emailVerification: false` or `profileValidation: false` to skip those checks on a specific field.

### `@hasPermission` directive

Enforces a named permission on a GraphQL field. `SUPERADMIN` bypasses automatically:

```graphql
type Mutation {
  deletePost(id: ID!): Boolean @hasPermission(permission: "posts:delete")
}
```

### `MercuriusContext` augmentation

`context.user` and `context.roles` are available in every resolver:

```typescript
const resolvers = {
  Query: {
    myData: async (_parent, _args, context) => {
      const { user, roles } = context;
      // ...
    },
  },
};
```

### Available GraphQL operations

**User:** `canAdminSignUp`, `me`, `user(id)`, `users(limit, offset, filters, sort)` / `adminSignUp`, `changeEmail`, `changePassword`, `deleteMe`, `disableUser`, `enableUser`, `removePhoto`, `updateMe`, `uploadPhoto`

**Invitation:** `getInvitationByToken`, `listInvitation` / `acceptInvitation`, `createInvitation`, `deleteInvitation`, `resendInvitation`, `revokeInvitation`

**Role:** `roles`, `rolePermissions` / `createRole`, `deleteRole`, `updateRolePermissions`

**Permission:** `permissions`

---

## ApiConfig Extension

This package extends `ApiConfig` (from `@prefabs.tech/fastify-config`) with a `user` field. TypeScript picks this up automatically via module augmentation — no extra setup needed:

```typescript
declare module "@prefabs.tech/fastify-config" {
  interface ApiConfig {
    user: UserConfig; // added by this package
  }
}
```

---

## Type Exports

| Type                            | Description                                         |
| ------------------------------- | --------------------------------------------------- |
| `UserConfig`                    | Full plugin configuration shape                     |
| `SupertokensConfig`             | SuperTokens sub-configuration                       |
| `User`                          | User database record                                |
| `AuthUser`                      | Combined SuperTokens + database user                |
| `UserCreateInput`               | Input for creating a user                           |
| `UserUpdateInput`               | Input for updating a user                           |
| `Invitation`                    | Invitation database record                          |
| `InvitationCreateInput`         | Input for creating an invitation                    |
| `InvitationUpdateInput`         | Input for updating an invitation                    |
| `EmailOptions`                  | Email subject/template override shape               |
| `StrongPasswordOptions`         | Password strength configuration                     |
| `IsEmailOptions`                | Email validation configuration                      |
| `SessionRecipe`                 | SuperTokens session recipe override type            |
| `ThirdPartyEmailPasswordRecipe` | SuperTokens TPEP recipe override type               |
| `EmailVerificationRecipe`       | SuperTokens email verification recipe override type |

---

## Use Cases

### Protecting routes with session + permission

When you need a route that requires both authentication and a specific permission:

```typescript
fastify.delete(
  "/articles/:id",
  {
    preHandler: [
      fastify.verifySession(),
      fastify.hasPermission("articles:delete"),
    ],
  },
  async (request) => {
    const userId = request.session!.getUserId();
    // delete the article...
  },
);
```

### Invitation-based onboarding flow

When your app uses invitation-only sign-up, configure the acceptance path and add post-accept logic:

```typescript
user: {
  invitation: {
    acceptLinkPath: "/onboarding/:token",
    expireAfterInDays: 7,
    postAccept: async (request, invitation, user) => {
      // e.g. assign the user to the correct tenant
      await assignUserToApp(invitation.appId, user.id);
    },
  },
}
```

### Enforcing profile completeness after sign-up

When you need users to fill in required fields before accessing the app, use the profile validation claim with a grace period:

```typescript
user: {
  features: {
    profileValidation: {
      enabled: true,
      fields: ["photo"],
      gracePeriodInDays: 3,
    },
  },
}
```

`GET /me` and `PUT /me` bypass the claim automatically so users can always update their profile. After 3 days, any other session-protected route returns `403` until the photo is uploaded.

### Overriding a single SuperTokens recipe function

When you need to add custom logic to SuperTokens sign-up without replacing the entire recipe:

```typescript
user: {
  supertokens: {
    recipes: {
      thirdPartyEmailPassword: {
        override: {
          functions: (originalImpl, fastify) => ({
            emailPasswordSignUp: async (input) => {
              const result = await originalImpl.emailPasswordSignUp(input);
              if (result.status === "OK") {
                await fastify.analytics.track("sign_up", { userId: result.user.id });
              }
              return result;
            },
          }),
        },
      },
    },
  },
}
```

### Disabling email verification on specific GraphQL fields

When a mutation must work even before the user has verified their email:

```graphql
type Mutation {
  resendVerificationEmail: Boolean @auth(emailVerification: false)
}
```
