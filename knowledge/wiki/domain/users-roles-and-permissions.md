---
type: Domain Concept
title: Users, Roles, and Permissions
description: What a user is in this system (a SuperTokens identity paired with an app users row), the states a user moves through, how roles and permissions are seeded and checked, and the special first-admin and profile-validation rules.
tags: [domain, users, roles, permissions, lifecycle, profile-validation]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: user-type
    resource: repo://packages/user/src/types/user.ts#L11-L22
    title: User type
  - id: users-ddl
    resource: repo://packages/user/src/migrations/queries.ts#L55-L74
    title: users table
  - id: constants
    resource: repo://packages/user/src/constants.ts#L15-L17
    title: Built-in roles
  - id: permission-constants
    resource: repo://packages/user/src/constants.ts#L62-L71
    title: Built-in permission names
  - id: seed-roles
    resource: repo://packages/user/src/lib/seedRoles.ts#L6-L17
    title: seedRoles
  - id: has-user-permission
    resource: repo://packages/user/src/lib/hasUserPermission.ts#L21-L43
    title: hasUserPermission
  - id: admin-signup
    resource: repo://packages/user/src/model/users/handlers/adminSignUp.ts#L16-L80
    title: First admin sign-up
  - id: verify-session
    resource: repo://packages/user/src/supertokens/recipes/config/session/verifySession.ts#L26-L40
    title: Deleted/disabled enforcement
  - id: create-session
    resource: repo://packages/user/src/supertokens/recipes/config/session/createNewSession.ts#L22-L50
    title: Session creation refuses deleted/disabled users
  - id: users-service
    resource: repo://packages/user/src/model/users/service.ts#L71-L164
    title: changePassword and deleteMe
  - id: post-delete
    resource: repo://packages/user/src/model/users/service.ts#L224-L228
    title: postDelete revokes sessions
  - id: users-factory
    resource: repo://packages/user/src/model/users/sqlFactory.ts#L23-L57
    title: Soft delete and roles join
  - id: profile-claim
    resource: repo://packages/user/src/supertokens/utils/profileValidationClaim.ts#L22-L120
    title: ProfileValidationClaim
  - id: features-config
    resource: repo://packages/user/src/types/config.ts#L30-L59
    title: Feature flags and defaults
  - id: role-service
    resource: repo://packages/user/src/model/roles/service.ts#L7-L45
    title: Role create/delete rules
  - id: phone-roles
    resource: repo://packages/phone-auth/src/recipe/consumeCode.ts#L22-L24
    title: Default role for passwordless sign-up
---

# Users, Roles, and Permissions

## What a "user" is
A user is **two records sharing one id**:

| Record | Owner | Holds |
|--------|-------|-------|
| SuperTokens user | SuperTokens core | Credentials, third-party identities, sessions, email verification, **role assignments and role permissions** (`st__user_roles` and related tables) |
| `users` row | this package | `id` (= SuperTokens id), `email` (copy), `disabled`, `deleted_at`, `photo_id`, `last_login_at`, `signed_up_at`; optional `profile` JSONB; optional `phone_number`[^users-ddl][^user-type] |

When the package reads a user it merges the two: `UserSqlFactory` joins role names from `public.st__user_roles` into a `roles` array.[^users-factory] Sign-up paths create the row right after the SuperTokens user and delete the SuperTokens user again if the row cannot be written ([user component](../components/user.md#keeping-supertokens-and-users-in-step)).

## Lifecycle
```
signed up ──► active ──► disabled ──► active (enable)
                 │
                 └──► soft-deleted (deleted_at set; terminal in this package)
```
- **disabled:**
  - `PUT /users/:id/disable` (permission `users:disable`).
  - The next `verifySession` revokes the session with 401 "User is disabled".
  - New sessions are refused.
  - GraphQL `@auth` returns 401.[^verify-session][^create-session]
- **soft-deleted:**
  - `DELETE /me` requires re-entering the password.
  - `deleted_at` is set by soft delete, and **every session for the user is revoked**.[^users-service][^post-delete]
  - Soft-deleted rows are excluded from reads, so the user loads as nobody.[^users-factory]
- **password change:** validates strength and checks the old password with a sign-in call, then **revokes all sessions**.[^users-service]

## Roles
- Built-in: `ADMIN`, `SUPERADMIN`, `USER`.[^constants] These, plus `config.user.roles`, are created (or have an empty permission list added) in SuperTokens on **every `onReady`**.[^seed-roles]
- Default role for phone sign-ups: `config.user.role || "USER"`.[^phone-roles]
- A role cannot be created if it exists, and cannot be deleted while any user holds it (`ROLE_IN_USE`).[^role-service]

## Permissions
Permissions are plain strings attached to roles in SuperTokens. The package defines names for its own routes: `invitations:create|delete|list|resend|revoke` and `users:disable|enable|list|read`.[^permission-constants]

`hasUserPermission(fastify, userId, permission)` decides access:[^has-user-permission]
1. If `permission` is **not listed in `config.user.permissions`** → **allowed**.
2. If the user has `SUPERADMIN` → allowed.
3. Otherwise → allowed only if some role of the user carries the permission.

So `config.user.permissions` is the switch that turns a permission check on. A route guarded by a permission the app never declared is open to any authenticated user. Enforcement points are listed in [Authentication and authorization](../security/authentication-and-authorization.md).

## The first admin
`POST /signup/admin` needs no session and only succeeds while **no user holds `ADMIN` or `SUPERADMIN`**. If both role lookups return `UNKNOWN_ROLE_ERROR` it answers 422; if either role already has a holder it answers 409.[^admin-signup]
- The new account gets `ADMIN`, plus `SUPERADMIN` whenever the `SUPERADMIN` role exists. After seeding it always does.
- Its email is auto-verified and a session is created.
- `GET /signup/admin` reports whether this is still possible.

## Profile validation (opt-in)
With `features.profileValidation.enabled` (default false), a user is "verified" when **none of `fields` is `null`** on their row.[^profile-claim][^features-config]
- An unverified user gets a grace period that ends at `signedUpAt + gracePeriodInDays` days.
- The claim is refetched on every validation.
- After the grace period, protected routes and `@auth` fields reject the session with a 403-class claim error.
- `GET/PUT /me` and similar routes exempt the claim, so the user can still complete the profile.

## Email verification (opt-in)
With `features.signUp.emailVerification` (default false), sign-up sends a verification email, or auto-verifies for admin and invitation sign-ups. The emailverification recipe is added and its claim becomes enforceable.[^features-config]

## Related
[Invitations](invitations.md) · [user component](../components/user.md)

[^users-ddl]: `id VARCHAR(36) PRIMARY KEY`, `disabled BOOLEAN NOT NULL DEFAULT false`, `deleted_at TIMESTAMP`.
[^user-type]: `deletedAt?`, `disabled`, `photo?`, `photoId?`, `profile?`, `roles?`.
[^users-factory]: `LEFT JOIN LATERAL (SELECT jsonb_agg(ur.role) ... FROM "public"."st__user_roles")`.
[^verify-session]: Revoke plus 401 for `deletedAt` and for `disabled`.
[^create-session]: Throws 401 before creating the session.
[^users-service]: `changePassword` L71-125 (`revokeAllSessionsForUser` L103); `deleteMe` L143-164.
[^post-delete]: `Session.revokeAllSessionsForUser(result.id)`.
[^constants]: `ROLE_ADMIN = "ADMIN"`, `ROLE_SUPERADMIN = "SUPERADMIN"`, `ROLE_USER = "USER"`.
[^seed-roles]: `UserRoles.createNewRoleOrAddPermissions(role, [])` in a loop.
[^phone-roles]: `input.userContext.roles || [fastify.config.user.role || ROLE_USER]`.
[^role-service]: `ROLE_ALREADY_EXISTS` L13-18; `ROLE_IN_USE` L35-40.
[^permission-constants]: `PERMISSIONS_*` constants.
[^has-user-permission]: The code comments read "Allow if provided permission is not defined" and "Allow if user has super admin role".
[^admin-signup]: Existence checks L24-38; roles L66-69; `autoVerifyEmail: true` L65; `createNewSession` L77.
[^profile-claim]: `isVerified` L22-68; `fetchValue` L84-120.
[^features-config]: JSDoc `@default false` on `profileValidation.enabled` and `signUp.emailVerification`; `signUp.enabled` defaults to true.
