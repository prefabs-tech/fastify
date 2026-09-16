# 11 — REST API reference

Every route registered by every package at 0.94, with its guard, its handler
override slot, and its schema. Paths are shown without the package's
`routePrefix`.

Three packages ship routes: `user`, `firebase`, and `mailer` (one test route).
**`s3`, `slonik`, `graphql`, `config`, `error-handler`, `swagger`, and
`phone-auth` register no routes of their own** — phone-auth's endpoints belong
to the SuperTokens plugin that `user` registers.

Every schema references `$ref: "ErrorResponse#"` for its error responses, which
resolves only when `@prefabs.tech/fastify-error-handler` is registered.

## `@prefabs.tech/fastify-user`

Prefix: `config.user.routePrefix`. Disable a group with
`config.user.routes.<group>.disabled = true`.

### Users — `routes.users`

| Method | Path | Guard | Override slot |
|---|---|---|---|
| GET | `/users` | session + `users:list` | `handlers.user.users` |
| GET | `/users/:id` | session + `users:read` | `handlers.user.user` |
| POST | `/change_password` | session | `handlers.user.changePassword` |
| POST | `/change-email` | session, claims filtered¹ | — |
| GET | `/me` | session, claims filtered¹ | `handlers.user.me` |
| PUT | `/me` | session, claims filtered¹ | `handlers.user.updateMe` |
| DELETE | `/me` | session, profile claim filtered | `handlers.user.deleteMe` |
| PUT | `/me/photo` | session, claims filtered¹ | — |
| DELETE | `/me/photo` | session, claims filtered¹ | — |
| PUT | `/users/:id/disable` | session + `users:disable` | `handlers.user.disable` |
| PUT | `/users/:id/enable` | session + `users:enable` | `handlers.user.enable` |
| POST | `/signup/admin` | **public** | `handlers.user.adminSignUp` |
| GET | `/signup/admin` | **public** | `handlers.user.canAdminSignUp` |

¹ `EmailVerificationClaim` and `ProfileValidationClaim` are filtered out of the
global validators, so a user with an unverified email or an incomplete profile
can still read and repair their own account.

Note the underscore in `/change_password` — it is the only path that uses one.

**Bodies and responses**

| Route | Body | 200 |
|---|---|---|
| `POST /signup/admin` | `{ email, password }` | `{ status, user }` |
| `GET /signup/admin` | — | `{ signUp: boolean }` |
| `POST /change-email` | `{ email }` | `{ status, message }` |
| `POST /change_password` | `{ oldPassword, newPassword }` | `{ statusCode, status, message }` |
| `DELETE /me` | `{ password }` | `{ status }` |
| `PUT /me` | free-form object (`additionalProperties: true`) | `User` |
| `PUT /me/photo` | `multipart/form-data`, field `photo` (`isFile`) | `User` |
| `DELETE /me/photo` | — | `User` |
| `PUT /users/:id/disable`, `/enable` | — | `{ status }` |
| `GET /users` | query `limit`, `offset`, `filters`, `sort` | `{ data, totalCount, filteredCount }` |

Two of these need more than their schema says:

- **`POST /change-email`** returns `200` in several cases where nothing
  changed — `EMAIL_SAME_AS_CURRENT_ERROR`, `EMAIL_ALREADY_EXISTS_ERROR`, and,
  when email verification is enabled and the new address is unverified, an `OK`
  that means *a verification link was sent*, not that the address changed. It
  answers `403` when `features.updateEmail.enabled === false` and `422` on a
  failed email validation. See [chapter 09](09-user.md).
- **`DELETE /me`** re-authenticates the supplied password before soft-deleting
  (`deleted_at`), and maps `USER_NOT_FOUND` / `INVALID_PASSWORD` to `422`. It
  does **not** revoke the user's existing sessions, despite what
  `packages/user/FEATURES.md` item 21 says.

`filters` and `sort` are **JSON strings**, parsed with `JSON.parse` and handed
to the service as `FilterInput` / `SortInput[]`:

```
GET /users?limit=20&filters={"key":"email","operator":"ct","value":"@example.com"}
```

The `User` response schema carries `id`, `email`, `roles`, `disabled`,
`lastLoginAt`, `signedUpAt` (all required), plus `deletedAt` and `photoId`.
`additionalProperties: true`, so `photo`, `profile`, and `thirdParty` pass
through even though they are not declared.

### Invitations — `routes.invitations`

| Method | Path | Guard | Override slot |
|---|---|---|---|
| GET | `/invitations` | session + `invitations:list` | `handlers.invitation.list` |
| POST | `/invitations` | session + `invitations:create` | `handlers.invitation.create` |
| GET | `/invitations/token/:token` | **public** | `handlers.invitation.getByToken` |
| POST | `/invitations/token/:token` | **public** | `handlers.invitation.accept` |
| PUT | `/invitations/revoke/:id` | session + `invitations:revoke` | `handlers.invitation.revoke` |
| POST | `/invitations/resend/:id` | session + `invitations:resend` | `handlers.invitation.resend` |
| DELETE | `/invitations/:id` | session + `invitations:delete` | `handlers.invitation.delete` |

The three `:id` routes use a numeric constraint — the registered pattern is
`` /invitations/:id(^\d+) `` — so a non-numeric id does not match the route at
all and returns Fastify's 404 rather than a validation error.

Create body: `{ email, role, appId?, payload? }`. Accept body:
`{ email, password }`. `POST /invitations/resend/:id` returns either the
invitation or `{ status: "ERROR", message }`.

### Roles — `routes.roles`

| Method | Path | Guard |
|---|---|---|
| GET | `/roles` | session only |
| POST | `/roles` | session only |
| DELETE | `/roles` | session only |
| GET | `/roles/permissions` | session only |
| PUT | `/roles/permissions` | session only |

**No permission check.** Any authenticated user can create, delete, and
re-permission roles. Restrict these at the gateway, or disable the group and
register your own controller, if that is not acceptable. There are no handler
override slots here.

`POST /roles` body `{ role, permissions? }` → 201 `{ status }`.
`DELETE /roles` and `GET /roles/permissions` take `role` as a **querystring**
parameter. `PUT /roles/permissions` body `{ role, permissions }` replaces the
set.

### Permissions — `routes.permissions`

| Method | Path | Guard |
|---|---|---|
| GET | `/permissions` | session only |

Returns `{ permissions: string[] }` — the strings in
`config.user.permissions`, for role-management UIs to discover.

### Profile fields — `routes.profileFields`

| Method | Path | Guard |
|---|---|---|
| GET | `/profile/fields` | session only |
| PATCH | `/users/profile` | session only |

`GET /profile/fields` returns `{ fields: ProfileField[] }` with `i18n` and
`options` arrays. `PATCH /users/profile` takes a free-form object and returns
the updated `User`. Both need `config.user.features.profileFields.enabled` for
the backing tables to exist.

## `@prefabs.tech/fastify-firebase`

Prefix: `config.firebase.routePrefix`. Every route is guarded by
`[fastify.verifySession(), isFirebaseEnabled(fastify)]` — the second throws
`404 Firebase is disabled` when `config.firebase.enabled === false`.

| Method | Path | Group | Override slot |
|---|---|---|---|
| POST | `/user-device` | `routes.userDevices` | `handlers.userDevice.addUserDevice` |
| DELETE | `/user-device` | `routes.userDevices` | `handlers.userDevice.removeUserDevice` |
| POST | `notification.test.path` (default `/send-notification`) | `routes.notifications` | `handlers.notification.sendNotification` |

The notification route is registered **only** when
`config.firebase.notification.test.enabled === true`, and not at all if
`routes.notifications.disabled` is set.

| Route | Body | 200 |
|---|---|---|
| `POST /user-device` | `{ deviceToken }` | `UserDevice` (nullable) |
| `DELETE /user-device` | `{ deviceToken }` | `UserDevice` (nullable) |
| `POST /send-notification` | `{ userId, title, body }` | `{ success, message }` |

Error statuses: `401` without `request.user`; `404` on delete when the user has
no devices; `422` on delete when the token is not theirs; `422` on send when
the receiver has no devices.

## `@prefabs.tech/fastify-mailer`

| Method | Path | Condition |
|---|---|---|
| GET | `test.path` | only when `test.enabled === true` |

Sends a fixed, inline-compiled MJML message to `test.to`. Returns
`{ status: "ok", message: "Email successfully sent", info: { from, to } }`.
Tagged `["email"]`.

## Guard summary

| Guard | Meaning |
|---|---|
| **public** | No preHandler |
| session | `fastify.verifySession()` with all global claim validators |
| session, claims filtered | `verifySession` with email-verification and/or profile-validation validators removed |
| session + `x:y` | `verifySession()` then `fastify.hasPermission("x:y")` |

A permission guard is **inert unless the permission string is listed in
`config.user.permissions`** — `hasUserPermission` returns `true` for any
permission it does not know about. `SUPERADMIN` bypasses all of them.
