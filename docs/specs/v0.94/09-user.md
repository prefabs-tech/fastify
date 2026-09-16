# 09 — `@prefabs.tech/fastify-user`

The largest package: SuperTokens-backed authentication, a local `users` table
kept in step with it, roles and permissions, invitations, profile fields, and
profile photos.

Peers: `@prefabs.tech/fastify-config`, `-error-handler`, `-graphql`, `-mailer`,
`-s3`, `-slonik`, `@fastify/cors`, `@fastify/formbody`, `fastify`,
`fastify-plugin`, `mercurius`, `mercurius-auth`, `slonik`,
`supertokens-node >= 14.1.4`, `zod`.

Configuration-only — it takes no plugin options and reads `fastify.config.user`
and `fastify.config.graphql`.

> Auth semantics — SuperTokens recipes, `verifySession` claim filtering,
> `hasPermission` — are security-sensitive. Changes here need review.

## Registration

Register after config, error-handler, slonik, s3, graphql (if enabled), and
after any plugin contributing a SuperTokens recipe.

```typescript
import cors from "@fastify/cors";
import formbody from "@fastify/formbody";
import userPlugin, {
  SUPERTOKENS_CORS_HEADERS,
  supertokensErrorHandler,
} from "@prefabs.tech/fastify-user";

await fastify.register(cors, {
  allowedHeaders: ["content-type", ...SUPERTOKENS_CORS_HEADERS],
  credentials: true,
  origin: config.appOrigin,
});
await fastify.register(formbody);
// ...
await fastify.register(userPlugin);
```

`@fastify/cors` and `@fastify/formbody` are peers because SuperTokens' own
endpoints need them. `SUPERTOKENS_CORS_HEADERS` is the eight headers that must
be allowed: `anti-csrf`, `authorization`, `fdi-version`, `front-token`, `rid`,
`st-access-token`, `st-auth-mode`, `st-refresh-token`.

Registration sequence inside the plugin: SuperTokens sub-plugin (init, error
handler, `verifySession`) → `onReady` role seeding → migrations → decorate
`hasPermission` → mercurius-auth when GraphQL is on → the five route groups.

## Configuration

`config.user` — every key optional except `supertokens`.

```typescript
config.user = {
  email: { host_blacklist: ["example.invalid"] },
  emailOverrides: {
    invitation: { subject: "You're invited", templateName: "invite" },
  },
  features: {
    profileFields: { enabled: true },
    profileValidation: { enabled: true, fields: ["profile"], gracePeriodInDays: 7 },
    signUp: { emailVerification: true, enabled: true },
    updateEmail: { enabled: true },
  },
  handlers: { user: {}, invitation: {} },
  invitation: { acceptLinkPath: "/signup/token/:token", expireAfterInDays: 30 },
  password: { minLength: 12, minNumbers: 1 },
  permissions: ["users:list", "users:read"],
  photoMaxSizeInMB: 5,
  role: "USER",
  roles: ["MANAGER"],
  routePrefix: "/api",
  routes: { invitations: { disabled: false } },
  s3: { bucket: "my-app-uploads" },
  services: { user: MyUserService },
  supertokens: { connectionUri: "http://localhost:3567" },
  tables: { users: { name: "users" } },
};
```

| Key | Notes |
|---|---|
| `supertokens` | Required — see below |
| `features.signUp.enabled` | Default `true` |
| `features.signUp.emailVerification` | Default **`false`**; enabling adds the recipe and enforces the claim |
| `features.profileValidation` | Default off. `fields` lists required `UserUpdateInput` keys; `gracePeriodInDays` delays enforcement |
| `features.profileFields.enabled` | Gates the profile-field tables **and their migrations** |
| `features.updateEmail.enabled` | Default **on** — only `=== false` disables, which makes `POST /change-email` and the `changeEmail` mutation answer 403 |
| `role` | Role assigned on sign-up; default `USER` |
| `roles` | Extra roles seeded on `onReady`, alongside `ADMIN`, `SUPERADMIN`, `USER` |
| `permissions` | The permission strings this app enforces — see the semantics below |
| `photoMaxSizeInMB` | Default `5` |
| `s3.bucket` | Bucket for profile photos |
| `services` | Replace `user`, `invitation`, or `userProfileField` service classes |
| `handlers` | Per-handler override slots |
| `tables` | Name overrides for six tables |
| `email` / `password` | `validator.js` options for the two validators |
| `emailOverrides` | `subject` / `templateName` per system email: `invitation`, `resetPassword`, `resetPasswordNotification`, `emailVerification`, `duplicateEmail` |

### SuperTokens

```typescript
supertokens: {
  apiBasePath: "/auth",
  checkSessionInDatabase: true,       // default true
  connectionUri: "http://localhost:3567",
  emailVerificationPath: "/verify-email",
  providers: { google: { clientId: "...", clientSecret: "..." } },
  recipes: { session: (fastify) => ({ /* TypeInput */ }) },
  refreshTokenCookiePath: "/auth/session/refresh",
  resetPasswordPath: "/reset-password",
  sendUserAlreadyExistsWarning: true,
  setErrorHandler: false,
}
```

`appInfo` is derived, not configured: `apiDomain` from `config.baseUrl`,
`appName` from `config.appName`, `websiteDomain` from `config.appOrigin[0]`.

Four recipes are initialised: `session`, `thirdPartyEmailPassword`,
`userRoles`, and `emailVerification` (only when
`features.signUp.emailVerification` is on). Each is overridable under
`recipes` — supply a function `(fastify) => RecipeConfig` to build it with
access to the instance, or an object to merge into the default. Within an
override, each key of `override.apis` and `override.functions` is called as
`fn(originalImplementation, fastify)` and merged over the default, so you
replace only the keys you name.

Providers: `apple`, `facebook`, `github`, `google`, plus `custom` for
`TypeProvider[]`.

`refreshTokenCookiePath`, when set, is applied by an `onSend` hook that
rewrites the `Path` attribute of the `sRefreshToken` cookie.

**`setErrorHandler`** defaults to on, meaning the plugin calls
`fastify.setErrorHandler(supertokensErrorHandler)` on the root context — where
it competes with the error-handler plugin. Set it to `false` and pass
`supertokensErrorHandler` as error-handler's `preErrorHandler` instead.

### Contributing a recipe from another plugin

```typescript
import { addSupertokensRecipe } from "@prefabs.tech/fastify-user";

addSupertokensRecipe(fastify, initMyRecipe);   // BEFORE registering userPlugin
```

SuperTokens allows one global `init()`, performed while this plugin registers.
Factories accumulate on `fastify.supertokensRecipes` and are drained by
`getRecipeList`. Calling this *after* the user plugin throws
`SuperTokens is already initialised. Register SuperTokens recipe plugins before
@prefabs.tech/fastify-user.`

## What it adds

| Surface | Value |
|---|---|
| `fastify.verifySession` | SuperTokens' Fastify `verifySession` |
| `fastify.hasPermission(permission)` | preHandler factory |
| `fastify.supertokensInitialized` | set once init has run |
| `fastify.supertokensRecipes` | the pending factory list |
| `request.user` | `User \| undefined`, from the local table |
| `request.session` | SuperTokens session |
| `context.user`, `context.roles` | on the Mercurius context |

## Authorization

Two layers, and the interaction between them is easy to get wrong.

```typescript
fastify.get("/reports", {
  preHandler: [fastify.verifySession(), fastify.hasPermission("reports:list")],
}, handler);
```

`hasPermission` throws a SuperTokens `UNAUTHORISED` error without a session
(401) and an `INVALID_CLAIMS` error without the permission (403).

**`hasUserPermission` allows anything not declared.** The check is:

```typescript
if (!permissions || !permissions.includes(permission)) return true;
```

If the permission string is not listed in `config.user.permissions`, **the check
passes for everyone.** Permissions are opt-in: a guard on
`"reports:list"` does nothing until `"reports:list"` appears in that array.

`SUPERADMIN` bypasses every check unconditionally.

Built-in permission constants: `PERMISSIONS_USERS_LIST`, `_READ`, `_DISABLE`,
`_ENABLE`; `PERMISSIONS_INVITATIONS_CREATE`, `_DELETE`, `_LIST`, `_RESEND`,
`_REVOKE`. Role constants: `ROLE_ADMIN`, `ROLE_SUPERADMIN`, `ROLE_USER`.

Note that the **roles routes carry no permission guard at all** — they require
only a valid session. Restrict them at the gateway, or replace the controller,
if role management should be privileged.

## Session claims

Two custom claims can gate every request: SuperTokens'
`EmailVerificationClaim` (when `features.signUp.emailVerification`) and this
package's `ProfileValidationClaim` (when
`features.profileValidation.enabled`), which checks that the fields listed in
`features.profileValidation.fields` are populated and honours
`gracePeriodInDays` from sign-up.

Routes a user must reach *in order to fix* their state filter those validators
out — `GET/PUT/DELETE /me`, the photo routes, and `POST /change-email` all pass
`overrideGlobalClaimValidators`. Do the same on your own routes:

```typescript
preHandler: fastify.verifySession({
  overrideGlobalClaimValidators: async (validators) =>
    validators.filter((v) => ![EmailVerificationClaim.key, ProfileValidationClaim.key].includes(v.id)),
});
```

In GraphQL the equivalent is `@auth(profileValidation: false, emailVerification: false)`.

## Routes

Five groups under `routePrefix`, each disableable via
`routes.<group>.disabled`. The full table with guards and schemas is in
[chapter 11](11-rest-api-reference.md). In summary:

- **users** — `GET /users`, `GET /users/:id`, `GET|PUT|DELETE /me`,
  `PUT|DELETE /me/photo`, `POST /change_password`, `POST /change-email`,
  `PUT /users/:id/disable`, `PUT /users/:id/enable`, `POST|GET /signup/admin`
- **invitations** — list, create, get-by-token, accept, revoke, resend, delete
- **roles** — `GET|POST|DELETE /roles`, `GET|PUT /roles/permissions`
- **permissions** — `GET /permissions`
- **profileFields** — `GET /profile/fields`, `PATCH /users/profile`

> `POST /change_password` uses an **underscore**, while every other multi-word
> path uses a hyphen. It is a published route path, so it stays as it is.

Handler override slots exist for the users and invitations groups only, and not
for every route even there — `changeEmail`, `uploadPhoto`, and `removePhoto`
are wired directly, as are all roles, permissions, and profile-field handlers.
To change those, replace the service via `config.user.services` or disable the
group and register your own controller.

## Users

The local `users` table mirrors SuperTokens, holding `id`, `email`, `disabled`,
`photo_id`, `last_login_at`, `signed_up_at`, `deleted_at`, and optionally
`profile`. `UserSqlFactory` enables **soft delete**, so `DELETE /me` sets
`deleted_at` and every read excludes deleted rows. It also joins
`st__user_roles` laterally so `roles` arrives on the row as a JSON array.

`filterUserUpdateInput` runs before every profile update and silently drops
`id`, `email`, `roles`, `lastLoginAt`, `signedUpAt`, `disable`, and `enable`.
Keys are camelised first, so `last_login_at` is stripped too. Dropping is
silent — no error tells the caller their field was ignored.

### Changing an email address

`POST /change-email` is not a simple update, and it answers `200` in several
situations where the address did **not** change. The flow:

1. `403` when `features.updateEmail.enabled === false`.
2. `422` when the address fails `validateEmail` against `config.user.email`.
3. `{ status: "EMAIL_SAME_AS_CURRENT_ERROR" }` when it matches the current one.
4. With `features.signUp.emailVerification` on and the new address unverified:
   `{ status: "EMAIL_ALREADY_EXISTS_ERROR" }` if an email-password account
   already holds it; otherwise a verification link is sent to the new address
   and the response is `{ status: "OK", message: "A verification link has been
   sent to your email." }` — **the email is not changed yet**. It changes when
   the user follows the link.
5. Only with verification off, or the address already verified, does the change
   apply immediately: `{ status: "OK", message: "Email updated successfully." }`.

So a client cannot treat `status: "OK"` as "the address changed" when email
verification is enabled. The GraphQL `changeEmail` mutation enforces the same
feature flag and follows the same path.

### Deleting an account

`DELETE /me` requires the current password in the body. `UserService.deleteMe`
looks the user up, rejects a missing password, and re-authenticates with
`emailPasswordSignIn` before calling `delete(userId)` — which, because
`UserSqlFactory` enables soft delete, sets `deleted_at` rather than removing
the row. Every failure is a `CustomError` (`USER_NOT_FOUND`,
`INVALID_PASSWORD`) that the handler maps to `422`.

> `packages/user/FEATURES.md` (item 21) describes this route as revoking all
> active SuperTokens sessions in the same operation. The source at 0.94 does
> not: `deleteMe` performs the soft delete only. `changePassword` is the method
> that calls `Session.revokeAllSessionsForUser`. Treat a deleted user's
> existing sessions as still live until they expire, and revoke them yourself
> if that matters.

Because the account is soft-deleted, the row still holds the email, and the
SuperTokens user still exists — a later sign-up with the same address does not
start from a clean slate.

### Photos

`PUT /me/photo` takes `multipart/form-data` with a `photo` field, uploads to
the `photo` path under `config.user.s3.bucket` via `FileService`, links the row,
and deletes the previous file when it changed. Supported MIME types are
`image/jpeg`, `image/png`, `image/webp`; the size cap is
`config.user.photoMaxSizeInMB` (default 5).

The handler maps `CustomError`s to HTTP: `PHOTO_FILE_TOO_LARGE` becomes 413,
anything else becomes 422.

Because photos go through `FileService`, this path needs the s3 plugin
registered **and** an `s3` block on the config object — see chapter 07.

## Invitations

`POST /invitations` validates email and role, rejects a duplicate pending
invitation, stores a row with a `gen_random_uuid()` token, and emails the link.
The link path comes from `invitation.acceptLinkPath` (default
`/signup/token/:token`), with `:token` substituted; expiry from
`invitation.expireAfterInDays` (default 30).

`POST /invitations/token/:token` is public: it validates the invitation,
creates the SuperTokens account, opens a session, and then calls
`config.user.invitation.postAccept(request, invitation, user)` if configured —
the hook for provisioning application-side records on acceptance.

`isInvitationValid` returns true only for a pending, non-expired, non-revoked,
non-accepted invitation.

## Exports

Plugin, schema, and route/resolver exports:
`default`, `userSchema`, `userRoutes`, `invitationRoutes`, `roleRoutes`,
`permissionRoutes`, `profileFieldsRoutes`, `userResolver`,
`invitationResolver`, `roleResolver`, `permissionResolver`.

Services and factories: `UserService`, `InvitationService`, `RoleService`,
`UserSqlFactory`, `InvitationSqlFactory`, `createUserFilterFragment`,
`createRoleSortFragment`.

SuperTokens: `addSupertokensRecipe`, `supertokensErrorHandler`,
`createUserContext`, `ProfileValidationClaim`, `isRoleExists`, `areRolesExist`,
`SupertokensRecipeFactory`.

Utilities: `getUserService`, `getInvitationService`, `hasUserPermission`,
`isInvitationValid`, `computeInvitationExpiresAt`, `getOrigin`, `sendEmail`,
`sendInvitation`, `verifyEmail`, `validateEmail`, `validatePassword`,
`formatDate` (re-exported from slonik).

Plus every constant from `constants.ts`, the migration query factories, and the
types from `types/`.
