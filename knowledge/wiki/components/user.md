---
type: Component
title: fastify-user
description: The identity package, which integrates SuperTokens (sessions, email/password and third-party sign-in, roles, email verification) with an app-owned users table, and adds invitations, roles and permissions, profile fields, profile photos, and GraphQL auth directives.
tags: [user, supertokens, auth, invitations, roles, package]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: index
    resource: repo://packages/user/src/index.ts#L6-L78
    title: Augmentations and exports
  - id: plugin
    resource: repo://packages/user/src/plugin.ts#L18-L60
    title: Plugin
  - id: st-plugin
    resource: repo://packages/user/src/supertokens/plugin.ts#L10-L54
    title: SuperTokens sub-plugin
  - id: st-init
    resource: repo://packages/user/src/supertokens/init.ts#L7-L25
    title: supertokens.init
  - id: recipes
    resource: repo://packages/user/src/supertokens/recipes/index.ts#L9-L27
    title: Recipe list
  - id: config-types
    resource: repo://packages/user/src/types/config.ts#L21-L148
    title: UserConfig
  - id: st-types
    resource: repo://packages/user/src/supertokens/types/index.ts#L20-L49
    title: SupertokensConfig and recipes
  - id: constants
    resource: repo://packages/user/src/constants.ts#L1-L103
    title: Routes, tables, roles, permissions, error codes
  - id: queries
    resource: repo://packages/user/src/migrations/queries.ts#L17-L159
    title: DDL
  - id: run-migrations
    resource: repo://packages/user/src/migrations/runMigrations.ts#L11-L26
    title: Migrations in one transaction
  - id: signup
    resource: repo://packages/user/src/supertokens/recipes/config/third-party-email-password/emailPasswordSignUp.ts#L16-L127
    title: emailPasswordSignUp override
  - id: signin
    resource: repo://packages/user/src/supertokens/recipes/config/third-party-email-password/emailPasswordSignIn.ts#L10-L58
    title: emailPasswordSignIn override
  - id: third-party
    resource: repo://packages/user/src/supertokens/recipes/config/third-party-email-password/thirdPartySignInUp.ts#L15-L94
    title: thirdPartySignInUp override
  - id: users-service
    resource: repo://packages/user/src/model/users/service.ts#L17-L297
    title: UserService
  - id: users-controller
    resource: repo://packages/user/src/model/users/controller.ts#L38-L218
    title: Users routes
  - id: users-factory
    resource: repo://packages/user/src/model/users/sqlFactory.ts#L16-L126
    title: UserSqlFactory
  - id: get-user-service
    resource: repo://packages/user/src/lib/getUserService.ts#L6-L14
    title: Service override
  - id: photo-spec
    resource: repo://docs/specs/user-photo-storage.md
    title: Pluggable photo storage spec (draft)
  - id: plugin-test
    resource: repo://packages/user/src/__test__/plugin.test.ts
    title: Plugin tests
---

# fastify-user

**Responsibility:** everything about who the caller is and what they may do.
- **SuperTokens owns** credentials, sessions, roles and permissions.
- **This package owns** the app's `users` row, the glue that keeps it in step with SuperTokens, and user-facing features built on both.

It is the largest and most frequently changed package in the repository.

## Registration
In order:[^plugin]
1. **SuperTokens sub-plugin**:[^st-plugin]
   - `supertokens.init` with `apiDomain = baseUrl`, `websiteDomain = appOrigin[0]`, `apiBasePath`, and `connectionURI`.[^st-init]
   - Recipe list: session, thirdpartyemailpassword, userroles, plus emailverification when `features.signUp.emailVerification`, plus any factories registered through `addSupertokensRecipe`.[^recipes]
   - `setErrorHandler` with SuperTokens' handler, unless `supertokens.setErrorHandler === false`.
   - Register SuperTokens' fastify plugin, decorate `verifySession`, and add the refresh-cookie `onSend` hook.
2. `onReady`: seed the roles.
3. Run migrations in **one transaction**: `users`, `invitations`, and when `features.profileFields.enabled`, the `users.profile JSONB` column plus four profile-field tables.[^run-migrations]
4. Decorate `hasPermission`.
5. Register the mercurius-auth directives when `config.graphql.enabled`.
6. Register route controllers under `routePrefix`: invitations, permissions, profileFields, roles, users. Each can be switched off with `routes.<group>.disabled`.

The default export also carries `updateContext`, which makes it a `GraphqlEnabledPlugin` ([GraphQL lifecycle](../architecture/graphql-request-lifecycle.md#2-context)).

## Decorators and augmentations
`fastify.verifySession`, `fastify.hasPermission`, `fastify.supertokensInitialized`, `fastify.supertokensRecipes`, `request.user`, `request.session`, `MercuriusContext.user`/`roles`, `ApiConfig.user`.[^index]

## Keeping SuperTokens and `users` in step
- **Email/password sign-up:**[^signup]
  1. Every role in `userContext.roles` must exist, or the call throws `SIGNUP_FAILED_ERROR`.
  2. Run SuperTokens sign-up.
  3. Insert the `users` row. **If the insert fails, the SuperTokens user is deleted** (compensating action).
  4. Assign roles. Failures are only logged.
  5. Auto-verify the email, or send a verification email.
  6. When `sendUserAlreadyExistsWarning` is set, send a warning email on `EMAIL_ALREADY_EXISTS_ERROR`.
- **Email/password sign-in:** without a `users` row the response is `WRONG_CREDENTIALS_ERROR`. Otherwise `last_login_at` is updated best-effort.[^signin]
- **Third-party sign-in/up:**[^third-party]
  - Sign-up is blocked with 404 when `features.signUp.enabled === false` and the provider identity is new.
  - A new user whose roles are invalid is deleted.
  - Row-insert failure also deletes the user.
  - A returning user gets `last_login_at` updated.
- Session-level checks for deleted, disabled and claims are on the [REST lifecycle](../architecture/rest-request-lifecycle.md#4-prehandler-verifysession).

## Routes (constants in `constants.ts`)[^constants]
| Group | Paths |
|-------|-------|
| users | `GET /users`, `GET /users/:id`, `PUT /users/:id/disable`, `PUT /users/:id/enable`, `GET/PUT/DELETE /me`, `PUT/DELETE /me/photo`, `POST /change_password`, `POST /change-email`, `GET/POST /signup/admin` |
| invitations | `GET/POST /invitations`, `GET/POST /invitations/token/:token`, `PUT /invitations/revoke/:id`, `POST /invitations/resend/:id`, `DELETE /invitations/:id` |
| roles | `GET/POST/DELETE /roles`, `GET/PUT /roles/permissions` |
| permissions | `GET /permissions` |
| profileFields | `GET /profile/fields`, `PATCH /users/profile` |

- The admin routes for users and invitations chain `hasPermission(PERMISSIONS_*)` after `verifySession()`.[^users-controller]
- **Handler overrides** exist only for `config.user.handlers.user.*` and `config.user.handlers.invitation.*`. `changeEmail`, `uploadPhoto` and `removePhoto` are wired directly, as are the roles, permissions and profileFields controllers.[^users-controller][^config-types]

## Data
- **`users`:** `id VARCHAR(36)` (the SuperTokens user id), `disabled`, `email`, `photo_id` FK → files, `last_login_at`, `signed_up_at`, `deleted_at`. Optional `profile JSONB`; `phone_number` is added by phone-auth.[^queries]
- **`invitations`:** see [Invitations](../domain/invitations.md).
- `UserSqlFactory`:[^users-factory]
  - Enables **soft delete**.
  - Joins roles from **`"public"."st__user_roles"`** (SuperTokens' table, hard-coded to the `public` schema) into `roles` as a JSON array.
  - Its `getCountSql` lateral join references `users.id` literally, where the other queries use the table identifier.
  - Service classes can be substituted through `config.user.services.{user,invitation,userProfileField}`.[^get-user-service]

## Profile photos (through s3)
- `UserService` lazily creates s3's `FileService` with the full config.
- **No `config.user.s3.bucket` → uploads and deletes are skipped with `console.warn`**, returning `undefined`.
- Accepted MIME types: jpeg, png, webp. The size limit is `photoMaxSizeInMB`, default 5, and is checked only for Buffer data.
- The key is `<userId>/photo/photo.<ext>`.
- `findById`, `findOne` and `update` each attach a **presigned URL valid for 7 days**.[^users-service]

A draft spec proposes replacing the s3 dependency with an injected `PhotoStorage` port. With no storage configured, photo routes would not be registered.[^photo-spec]

## Config highlights (`UserConfig`)
`supertokens` (required: `connectionUri`; optional `apiBasePath`, `checkSessionInDatabase`, `recipes`, `providers`, `refreshTokenCookiePath`, `setErrorHandler`, `sendUserAlreadyExistsWarning`, …), `features`, `handlers`, `services`, `invitation`, `roles`, `role`, `permissions`, `password`, `email`, `emailOverrides`, `photoMaxSizeInMB`, `s3.bucket`, `routePrefix`, `routes`, `tables`.[^config-types][^st-types]

## Tests
`src/__test__/plugin.test.ts` mocks the SuperTokens plugin, migrations, `seedRoles` and mercurius-auth, and asserts decorators and route toggles.[^plugin-test] The remaining tests are pure `.spec.ts` files for libs, validators, the claim and the middleware. **No test exercises the SuperTokens overrides against a core.**

## Related
[Users, roles and permissions](../domain/users-roles-and-permissions.md) · [SuperTokens integration model](../reference/supertokens-integration-model.md) · [Authentication and authorization](../security/authentication-and-authorization.md)

## Open questions
- `getCountSql` references `users.id` literally. Does counting work when `tables.users.name` is overridden?
- Nothing in this repository sets `request.dbSchema`, yet the sign-up overrides call `getUserService(config, slonik)` without a schema. Which consumer sets per-request schemas, and are sign-ups expected to always write to `public`?

[^index]: Augmentations L6-29; exports L31-78.
[^plugin]: L21 supertokens, L23-25 onReady, L27 migrations, L29 decorator, L31-33 mercurius-auth, L35-55 routes.
[^st-plugin]: `init` L15; error handler L17-19; decorator L25; `onSend` L28-53.
[^st-init]: `appInfo` L11-16; `supertokens.connectionURI` L19-21.
[^recipes]: L10-24.
[^config-types]: `handlers` covers only `invitation` and `user` (L60-82); `services` L122-126.
[^st-types]: `SupertokensConfig` L20-34.
[^constants]: Route constants L1-31, L52-56.
[^queries]: users L55-74; the phone-auth column is added in its own package.
[^run-migrations]: `connection.transaction(...)`.
[^signup]: Role check L25-30; compensating `deleteUser` L49-53; email verification L73-99.
[^signin]: L28-32 returns `WRONG_CREDENTIALS_ERROR` without a row.
[^third-party]: Sign-up gate L30-32; compensating deletes L44-51 and L73-77.
[^users-controller]: `changeEmail` uses `handlers.changeEmail` (L89); the photo routes use `handlers.uploadPhoto`/`removePhoto` (L158, L176).
[^users-factory]: Soft delete L23; count L25-40 contains `WHERE ur.user_id = users.id`.
[^get-user-service]: `config.user.services?.user || UserService`.
[^users-service]: Bucket L18-20; `fileService` L25-35; presign L209-222; `upload` L242-295.
[^photo-spec]: §2 rules; status "draft, pending decisions in §9".
[^plugin-test]: Mocks at L16-30.
