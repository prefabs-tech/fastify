# 12 — GraphQL API reference

The merged schema surface contributed by the packages, the directives that
protect it, and how to assemble it.

Everything here requires `config.graphql.enabled` to be **truthy** and
`@prefabs.tech/fastify-graphql` registered — see chapter 04.

## Assembling the schema

Each package exports a merged `DocumentNode` and its resolvers separately:

```typescript
import graphqlPlugin, { mergeTypeDefs } from "@prefabs.tech/fastify-graphql";
import userPlugin, {
  invitationResolver, permissionResolver, roleResolver,
  userResolver, userSchema,
} from "@prefabs.tech/fastify-user";
import firebasePlugin, {
  firebaseSchema, notificationResolver, userDeviceResolver,
} from "@prefabs.tech/fastify-firebase";

await fastify.register(graphqlPlugin, {
  enabled: true,
  plugins: [userPlugin],
  resolvers: {
    Mutation: {
      ...userResolver.Mutation, ...invitationResolver.Mutation,
      ...roleResolver.Mutation, ...notificationResolver.Mutation,
      ...userDeviceResolver.Mutation,
    },
    Query: {
      ...userResolver.Query, ...invitationResolver.Query,
      ...roleResolver.Query, ...permissionResolver.Query,
    },
  },
  schema: mergeTypeDefs([userSchema, firebaseSchema, myAppSchema]),
});
```

`userSchema` and `firebaseSchema` each already include `baseSchema`;
`mergeTypeDefs` de-duplicates. Listing `userPlugin` under `plugins` is what
populates `context.user` and `context.roles`.

## Base schema

From `@prefabs.tech/fastify-graphql`:

```graphql
directive @auth(profileValidation: Boolean, emailVerification: Boolean)
  on OBJECT | FIELD_DEFINITION
directive @hasPermission(permission: String!) on OBJECT | FIELD_DEFINITION

scalar DateTime
scalar JSON

input Filters {
  AND: [Filters]  OR: [Filters]
  not: Boolean    key: String
  operator: String  value: String
}
enum SortDirection { ASC DESC }
input SortInput { key: String  direction: SortDirection }
type DeleteResult { result: Boolean! }
```

`Filters` and `SortInput` map one-to-one onto the slonik `FilterInput` and
`SortInput` types, so a resolver argument can go straight to a service. The
operator strings are the ones in [chapter 03](03-slonik.md).

## Directives

Both are declared by the graphql package and **implemented by
`@prefabs.tech/fastify-user`** through `mercurius-auth`, registered only when
`config.graphql.enabled` is truthy. Without the user package they are inert —
the field resolves unprotected.

### `@auth`

Checks, in order: an authenticated session; the account is not disabled; the
email is verified (when `features.signUp.emailVerification` is on, unless
`emailVerification: false`); the profile is complete (when
`features.profileValidation.enabled`, unless `profileValidation: false`).

Failures return `401 unauthorized`, `401 user is disabled`, or `403 invalid
claim`. The 403 carries `claimValidationErrors` shaped to match the REST
response, so one client-side handler covers both transports.

```graphql
me: User! @auth(profileValidation: false, emailVerification: false)
```

### `@hasPermission`

```graphql
deleteReport(id: Int!): DeleteResult @hasPermission(permission: "reports:delete")
```

Returns `401` without a session and `403 invalid claim` without the permission.
`SUPERADMIN` bypasses. As with REST, the check **passes for everyone** unless
the permission string is listed in `config.user.permissions`.

## User package surface

### Types

```graphql
type User {
  id: String!        deletedAt: Float    disabled: Boolean!
  email: String!     lastLoginAt: Float!  photoId: Int
  photo: Photo       roles: [String]      signedUpAt: Float!
  timeJoined: Float
}
type Photo { id: Int!  url: String! }
type Users { totalCount: Int  filteredCount: Int  data: [User]! }
type Invitation {
  id: Int!  acceptedAt: Float  appId: Int  email: String!
  expiresAt: Float!  invitedById: String!  payload: JSON
  revokedAt: Float  role: String!  createdAt: Float!  updatedAt: Float!
}
type Invitations { totalCount: Int  filteredCount: Int  data: [Invitation]! }
type Role { role: String!  permissions: [String]! }
```

`@prefabs.tech/fastify-phone-auth` adds `phoneNumber: String` to `User` at
`onReady`, not in the SDL.

### Queries

| Query | Guard |
|---|---|
| `canAdminSignUp: CanAdminSignUpResponse` | public |
| `me: User!` | `@auth(profileValidation: false, emailVerification: false)` |
| `user(id: String): User` | `@auth` |
| `users(limit, offset, filters, sort): Users!` | `@auth` |
| `invitations(limit, offset, filters, sort): Invitations!` | **none** |
| `getInvitationByToken(token: String!): Invitation` | **none** |
| `permissions: [String]!` | `@auth` |
| `roles: [Role]!` | `@auth` |
| `rolePermissions(role: String!): [String]!` | `@auth` |

Note that `invitations` and `getInvitationByToken` carry no directive in the
SDL. `getInvitationByToken` is public by design — the signup UI needs it before
a session exists — but the `invitations` **list** is unprotected too, unlike
its REST counterpart, which requires `invitations:list`. Guard it at the
gateway or override the resolver if that matters.

### Mutations

| Mutation | Guard |
|---|---|
| `adminSignUp(data: SingUpFieldInput!): AuthResponse` | public |
| `acceptInvitation(token, data): AuthResponse` | public |
| `changeEmail(email: String!): ChangeEmailResponse` | `@auth(profileValidation: false, emailVerification: false)` |
| `changePassword(oldPassword, newPassword): ChangePasswordResponse` | `@auth` |
| `deleteMe(password: String!): deleteUserResponse` | `@auth` |
| `disableUser(id: String!): UpdateUserResponse` | `@auth` |
| `enableUser(id: String!): UpdateUserResponse` | `@auth` |
| `updateMe(data: UserUpdateInput): User` | `@auth(profileValidation: false, emailVerification: false)` |
| `uploadPhoto(photo: Upload!): User` | `@auth(profileValidation: false, emailVerification: false)` |
| `removePhoto: User` | `@auth(profileValidation: false, emailVerification: false)` |
| `createInvitation(data: InvitationCreateInput!): Invitation` | `@auth` |
| `deleteInvitation(id: Int!): Invitation` | `@auth` |
| `resendInvitation(id: Int!): Invitation` | `@auth` |
| `revokeInvitation(id: Int!): Invitation` | `@auth` |
| `createRole(role, permissions): RoleResponse!` | `@auth` |
| `deleteRole(role: String!): RoleResponse!` | `@auth` |
| `updateRolePermissions(role, permissions): UpdateRolePermissionsResponse!` | `@auth` |

The GraphQL mutations use `@auth` where the REST equivalents use
`hasPermission` — `disableUser` needs only a session here, while
`PUT /users/:id/disable` needs `users:disable`. The two transports are not
equivalent on authorization; pick one as the enforcement point or add
`@hasPermission` yourself.

`uploadPhoto` needs the upload transport — on by default with the graphql
plugin, configured through its `uploads` option.

## Firebase package surface

```graphql
type UserDevice {
  id: Int!  userId: String!  deviceToken: String!
  createdAt: Float!  updatedAt: Float!
}
type SendNotificationResponse { message: String! }
input SendNotificationInput { userId: String!  title: String!  body: String! }
input UserDeviceCreateInput { deviceToken: String! }
input UserDeviceRemoveInput { deviceToken: String! }

type Mutation {
  sendNotification(data: SendNotificationInput): SendNotificationResponse @auth
  addUserDevice(data: UserDeviceCreateInput): UserDevice @auth
  removeUserDevice(data: UserDeviceRemoveInput): UserDevice @auth
}
```

All three are `@auth`-protected and return `404` when Firebase is disabled,
`401` when unauthenticated, and `500` on an unexpected error.
`sendNotification` returns `400` without `userId` and `404` when the receiver
has no devices; `removeUserDevice` returns `403` when the user has no devices
or the device is not theirs.

Two differences from the REST equivalents, both in the source rather than the
documentation:

- **The push payload is not the same.** The REST handler builds a
  `MulticastMessage` with Android `priority: "high"` and `sound: "default"` and
  an APNS `sound` payload; the GraphQL resolver sends only `data` and
  `notification`. A notification delivered over GraphQL will not have the
  high-priority or sound behaviour.
- **Guard order differs.** `sendNotification` checks the session before the
  `enabled` flag, so a disabled Firebase returns `401` to an anonymous caller;
  `addUserDevice` and `removeUserDevice` check the flag first and return `404`.

## The resolver context

```typescript
{
  config: ApiConfig;        // from the graphql plugin
  database: Database;       // request.slonik — note the name
  dbSchema: string;
  user: User | undefined;   // added by userPlugin.updateContext
  roles: string[] | undefined;
  app, reply, ...           // mercurius' own
}
```

A resolver follows the same pattern as a REST handler — thin, delegating to a
service:

```typescript
const resolvers = {
  Query: {
    reports: async (_parent, { filters, limit, offset, sort }, context) => {
      const service = new ReportService(context.config, context.database, context.dbSchema);
      return service.list(limit, offset, filters, sort);
    },
  },
};
```

`updateContext` runs before every request for each plugin in `plugins`, in
array order. Supplying your own `options.context` replaces the default factory
entirely, losing `config`, `database`, and `dbSchema` unless you rebuild them.

## Parity rule

When a package ships both REST routes and GraphQL for an entity, the two must
stay in feature parity — a new field, route, or mutation lands on both sides in
the same change. The authorization differences noted above are pre-existing
gaps, not licence to add more.
