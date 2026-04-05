<!-- Structured feature inventory — used by automated test generation. Developer docs: see GUIDE.md -->

# @prefabs.tech/fastify-user — Features

## Plugin Lifecycle

1. **Configurable route prefix** — all route modules are registered under `config.user.routePrefix`.

2. **Selective route module disabling** — each of the four route groups (`users`, `invitations`, `roles`, `permissions`) can be disabled independently via `routes.<group>.disabled = true`. The service layer is unaffected.

3. **Automatic database migrations** — on registration, runs `CREATE TABLE IF NOT EXISTS` for the `users` and `invitations` tables before the server is ready.

4. **Default role seeding** — on `onReady`, seeds `ADMIN`, `SUPERADMIN`, and `USER` into SuperTokens, plus any extra roles listed in `config.user.roles`.

## Authentication

5. **`fastify.verifySession()` decorator** — added to the Fastify instance; use it as a `preHandler` to require a valid SuperTokens session on any route.

6. **`req.session` request property** — `FastifyRequest` is augmented with an optional `session` property (populated by SuperTokens after `verifySession` runs).

7. **`req.user` request property** — `FastifyRequest` is augmented with an optional `user: User` property, populated from the database on every verified session.

8. **Configurable refresh-token cookie path** — an `onSend` hook rewrites the `Path` attribute of the `sRefreshToken` cookie to the value of `config.user.supertokens.refreshTokenCookiePath`, so the refresh token is scoped to the refresh endpoint.

9. **`SUPERTOKENS_CORS_HEADERS` constant** — exports the eight SuperTokens-specific request headers that must be included in `allowedHeaders` when registering `@fastify/cors`:

   ```
   anti-csrf, authorization, fdi-version, front-token,
   rid, st-access-token, st-auth-mode, st-refresh-token
   ```

10. **SuperTokens error handler auto-registration** — automatically calls `fastify.setErrorHandler(supertokensErrorHandler)` unless `config.user.supertokens.setErrorHandler === false`.

11. **`supertokensErrorHandler` export** — exported for manual wiring when auto-registration is disabled.

12. **Session recipe override via function factory** — each SuperTokens recipe (`session`, `thirdPartyEmailPassword`, `userRoles`, `emailVerification`) can be overridden by supplying a function `(fastify) => RecipeConfig` under `config.user.supertokens.recipes`. The function receives the Fastify instance, enabling access to config and decorators. Providing an object instead of a function merges the object into the default config.

13. **Override merging for `apis` and `functions`** — when a recipe override includes `override.apis` or `override.functions`, each key is called as `fn(originalImplementation, fastify)` and merged on top of the default implementation, so only the keys you provide are replaced.

14. **Email verification (opt-in)** — setting `config.user.features.signUp.emailVerification = true` adds the `EmailVerification` recipe and enforces the email-verified claim on protected routes. Default: `false`.

15. **Third-party OAuth providers** — Apple, Facebook, GitHub, and Google providers are configurable via `config.user.supertokens.providers`; custom providers are supported via `providers.custom`.

## User Management

16. **`GET /me`** — returns the authenticated user's profile. If a photo exists, the `photo.url` field is a pre-signed S3 URL. Session claims (email verification, profile validation) are bypassed so users can always read their own data.

17. **`PUT /me`** — updates mutable fields on the current user's profile. Session claims are bypassed.

18. **`POST /change-email`** — updates the authenticated user's email address. Gated by `config.user.features.updateEmail.enabled`. Session email-verification claims are bypassed on this route.

19. **`POST /change_password`** — validates the current password before updating. Requires a valid session.

20. **`DELETE /me` with atomic session revocation** — soft-deletes the user record (`deleted_at`) and immediately revokes all active SuperTokens sessions in the same operation. Requires password confirmation.

21. **`PUT /me/photo`** — accepts `multipart/form-data`, validates MIME type (`image/jpeg`, `image/png`, `image/webp`) and file size, uploads to `{userId}/photo` in the configured S3 bucket, and links the file record to the user. Session claims bypassed.

22. **`DELETE /me/photo`** — deletes the photo from S3 and unlinks it from the user record. Session claims bypassed.

23. **Configurable photo size limit** — `config.user.photoMaxSizeInMB` (default: `5`).

24. **`POST /signup/admin`** — public endpoint to create the first administrator account without an invitation.

25. **`GET /signup/admin`** — public endpoint returning `{ signUp: boolean }` indicating whether admin sign-up is currently available.

26. **`GET /users`** — paginatable list of all users. Requires `users:list` permission.

27. **`GET /users/:id`** — fetches a single user by ID. Requires `users:read` permission.

28. **`PUT /users/:id/disable`** — sets the user's `disabled` flag to `true`. Requires `users:disable` permission.

29. **`PUT /users/:id/enable`** — clears the user's `disabled` flag. Requires `users:enable` permission.

30. **Immutable field guard (`filterUserUpdateInput`)** — applied automatically before every profile update; silently drops any attempt to set `id`, `email`, `roles`, `lastLoginAt`, `signedUpAt`, `disable`, or `enable`. Handles both camelCase and snake_case variants (e.g. `last_login_at` is also stripped).

31. **Configurable table names** — `config.user.tables.users.name` and `config.user.tables.invitations.name` override the default table names.

32. **Custom request handlers** — every route handler can be replaced via `config.user.handlers.user.<handlerName>` or `config.user.handlers.invitation.<handlerName>`.

## Authorization

33. **`fastify.hasPermission(permission)` decorator** — added to the Fastify instance; returns a `preHandler` that checks the authenticated user holds the given permission. Returns 401 without a session, 403 without the permission.

34. **`hasUserPermission(fastify, userId, permission)` utility** — programmatic permission check; returns a boolean.

35. **SUPERADMIN bypass** — users with the `SUPERADMIN` role pass all `hasPermission` and `hasUserPermission` checks automatically, without being explicitly granted every permission.

36. **Built-in permission constants** — pre-defined strings to avoid typos:

    ```
    PERMISSIONS_INVITATIONS_CREATE  → "invitations:create"
    PERMISSIONS_INVITATIONS_DELETE  → "invitations:delete"
    PERMISSIONS_INVITATIONS_LIST    → "invitations:list"
    PERMISSIONS_INVITATIONS_RESEND  → "invitations:resend"
    PERMISSIONS_INVITATIONS_REVOKE  → "invitations:revoke"
    PERMISSIONS_USERS_DISABLE       → "users:disable"
    PERMISSIONS_USERS_ENABLE        → "users:enable"
    PERMISSIONS_USERS_LIST          → "users:list"
    PERMISSIONS_USERS_READ          → "users:read"
    ```

37. **Application-defined custom permissions** — `config.user.permissions` registers additional permission strings returned by `GET /permissions`, making them discoverable by role-management UIs.

## Roles

38. **Built-in role constants** — `ROLE_ADMIN`, `ROLE_SUPERADMIN`, `ROLE_USER` are exported.

39. **`POST /roles`** — creates a new role with optional initial permissions. Requires a valid session.

40. **`DELETE /roles`** — deletes a role; returns `ROLE_IN_USE` error if any user holds it. Requires a valid session.

41. **`GET /roles`** — returns all roles with their permissions. Requires a valid session.

42. **`GET /roles/permissions`** — returns the permissions for a named role. Requires a valid session.

43. **`PUT /roles/permissions`** — replaces the permission set of a named role. Requires a valid session.

44. **`isRoleExists(name)` / `areRolesExist(names)` utilities** — programmatic existence checks against SuperTokens.

## Invitations

45. **`POST /invitations`** — creates an invitation record, validates the target email and role, checks for a duplicate pending invitation, and sends the invitation email. Requires `invitations:create` permission.

46. **Configurable invitation expiry** — `config.user.invitation.expireAfterInDays` sets how long an invitation is valid (default: `30`).

47. **Configurable accept link path** — `config.user.invitation.acceptLinkPath` sets the front-end path embedded in the invitation email (default: `"/signup/token/:token"`). The `:token` placeholder is replaced with the actual token.

48. **`GET /invitations/token/:token`** — public endpoint returning the invitation record for UI display before acceptance.

49. **`POST /invitations/token/:token`** — public endpoint that validates the invitation, creates a SuperTokens account, opens a session, and optionally calls `config.user.invitation.postAccept(request, invitation, user)`.

50. **`GET /invitations`** — paginatable list of all invitations. Requires `invitations:list` permission.

51. **`PUT /invitations/revoke/:id`** — marks an invitation as revoked. Requires `invitations:revoke` permission.

52. **`POST /invitations/resend/:id`** — re-sends the invitation email. Requires `invitations:resend` permission.

53. **`DELETE /invitations/:id`** — permanently removes an invitation record. Requires `invitations:delete` permission.

54. **`isInvitationValid(invitation)` utility** — returns `true` only when the invitation is pending, non-expired, non-revoked, and non-accepted.

55. **`computeInvitationExpiresAt(config, explicitDate?)` utility** — computes the expiry timestamp using the configured `expireAfterInDays`, or returns `explicitDate` when provided.

56. **`getOrigin(url)` utility** — extracts `scheme://host[:non-default-port]` from a URL string. Returns an empty string for bare hostnames, IP addresses without a scheme, relative paths, or any input that is not a full URL. Default ports (`80` / `443`) are stripped.

57. **`sendInvitation(fastify, invitation, origin)` utility** — sends the invitation email; usable from custom code that bypasses the REST route.

## Email

58. **`validateEmail(email, config)` utility** — validates an email string against `config.user.email` options using `validator.js`. Returns `{ success: true }` or `{ success: false, message }`. Gracefully falls back to permissive defaults when no email config is provided.

59. **Email domain whitelist / blacklist** — `config.user.email.host_whitelist` and `config.user.email.host_blacklist` restrict which domains are accepted during sign-up and invitation.

60. **Custom email subjects and templates** — `config.user.emailOverrides` overrides the subject and `templateName` for any of the five system emails: `invitation`, `resetPassword`, `resetPasswordNotification`, `emailVerification`, `duplicateEmail`.

61. **`sendEmail(options)` utility** — sends a templated email via `fastify.mailer`; accepts `{ fastify, subject, templateName, to, templateData }`.

62. **`verifyEmail(userId, email)` utility** — programmatically marks a user's email as verified in SuperTokens (useful for invited users who skip the verification link).

## Password

63. **`validatePassword(password, config)` utility** — validates password strength against `config.user.password` options. Returns `{ success: true }` or `{ success: false, message }` listing all failed requirements.

64. **Configurable strength thresholds** — `config.user.password` accepts `minLength` (default: `8`), `minLowercase`, `minUppercase`, `minNumbers`, `minSymbols` (all default to `0` unless configured), and scoring tuning fields (`pointsPerUnique`, `pointsPerRepeat`, `pointsForContaining*`).

## Profile Validation Claim

65. **`ProfileValidationClaim` custom session claim** — a SuperTokens `SessionClaim` that checks whether required profile fields are populated. Re-fetched on every request. Enable via `config.user.features.profileValidation.enabled = true` and list required fields in `features.profileValidation.fields`.

66. **Grace period** — `config.user.features.profileValidation.gracePeriodInDays` allows users to access protected resources for N days after sign-up before the claim is enforced. After the grace period, requests fail with 403.

67. **Per-route claim opt-out** — routes that must stay accessible regardless of profile completeness can bypass the claim via `verifySession({ overrideGlobalClaimValidators: () => [] })` (REST) or `@auth(profileValidation: false)` (GraphQL).

## GraphQL Integration

> Requires `config.graphql.enabled = true` and `@prefabs.tech/fastify-graphql`.

68. **MercuriusContext extended with `user` and `roles`** — `context.user: User | undefined` and `context.roles: string[] | undefined` are populated before each resolver via `plugin.updateContext`.

69. **`@auth` directive** — protects a field or mutation; checks (1) authenticated session, (2) non-disabled account, (3) email verified (if enabled, unless `emailVerification: false` is passed), (4) profile complete (if enabled, unless `profileValidation: false` is passed).

70. **`@hasPermission(permission)` directive** — enforces a named permission on a GraphQL field; SUPERADMIN bypasses automatically.

71. **User GraphQL types** — `User`, `Photo`, `Users` (paginated wrapper with `totalCount`, `filteredCount`, `data`).

72. **User queries** — `canAdminSignUp`, `me`, `user(id)`, `users(limit, offset, filters, sort)`.

73. **User mutations** — `adminSignUp`, `changeEmail`, `changePassword`, `deleteMe`, `disableUser`, `enableUser`, `removePhoto`, `updateMe`, `uploadPhoto`.

74. **Invitation GraphQL types and operations** — `Invitation` type; queries `getInvitationByToken`, `listInvitation`; mutations `acceptInvitation`, `createInvitation`, `deleteInvitation`, `resendInvitation`, `revokeInvitation`.

75. **Role GraphQL types and operations** — `Role` type; queries `roles`, `rolePermissions`; mutations `createRole`, `deleteRole`, `updateRolePermissions`.

76. **`permissions` GraphQL query** — returns the configured permission strings.

77. **`userSchema` merged schema export** — the complete SDL string combining all user, invitation, role, and permission type definitions; ready to pass to `mergeTypeDefs`.

78. **Resolver exports** — `userResolver`, `invitationResolver`, `roleResolver`, `permissionResolver` are exported individually for spreading into a larger resolver map.
