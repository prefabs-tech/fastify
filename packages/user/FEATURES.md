<!-- Structured feature inventory — used by automated test generation. Developer docs: see GUIDE.md -->

# @prefabs.tech/fastify-user — Features

## Plugin Lifecycle

1. **Configurable route prefix** — all route modules are registered under `config.user.routePrefix`.

2. **Selective route module disabling** — each of the four route groups (`users`, `invitations`, `roles`, `permissions`) can be disabled independently via `routes.<group>.disabled = true`. The service layer is unaffected.

3. **Automatic database migrations** — on registration, runs idempotent SQL for the `users` and `invitations` tables, then applies the SuperTokens core v6 multitenancy upgrade (`st__*` schema changes) in the same transaction, before the server is ready. The ST v6 upgrade uses re-runnable `IF EXISTS` / `IF NOT EXISTS` / `ON CONFLICT` forms.

4. **Default role seeding** — on `onReady`, seeds `ADMIN`, `SUPERADMIN`, and `USER` into SuperTokens, plus any extra roles listed in `config.user.roles`.

5. **SuperTokens recipe registry** — `addSupertokensRecipe(fastify, factory)` lets another plugin contribute a SuperTokens recipe. Factories are collected on the `fastify.supertokensRecipes` decorator and drained by `getRecipeList` during `supertokens.init()`. Since SuperTokens allows exactly one global `init()` and this package performs it during its own registration, contributing plugins must be registered **before** it; `addSupertokensRecipe` throws once `fastify.supertokensInitialized` is set. Used by `@prefabs.tech/fastify-phone-auth`.

## Authentication

6. **`fastify.verifySession()` decorator** — added to the Fastify instance; use it as a `preHandler` to require a valid SuperTokens session on any route.

7. **`req.session` request property** — `FastifyRequest` is augmented with an optional `session: AuthSession` property (populated by SuperTokens after `verifySession` runs).

8. **`req.user` request property** — `FastifyRequest` is augmented with an optional `user: User` property, populated from the database on every verified session.

9. **Configurable refresh-token cookie path** — an `onSend` hook rewrites the `Path` attribute of the `sRefreshToken` cookie to the value of `config.user.supertokens.refreshTokenCookiePath`, so the refresh token is scoped to the refresh endpoint.

10. **`SUPERTOKENS_CORS_HEADERS` constant** — exports the eight SuperTokens-specific request headers that must be included in `allowedHeaders` when registering `@fastify/cors`:

   ```
   anti-csrf, authorization, fdi-version, front-token,
   rid, st-access-token, st-auth-mode, st-refresh-token
   ```

11. **SuperTokens error handler auto-registration** — automatically calls `fastify.setErrorHandler(supertokensErrorHandler)` unless `config.user.supertokens.setErrorHandler === false`.

12. **`supertokensErrorHandler` export** — exported for manual wiring when auto-registration is disabled.

13. **Session recipe override via function factory** — each SuperTokens recipe (`session`, `thirdPartyEmailPassword`, `userRoles`, `emailVerification`) can be overridden by supplying a function `(fastify) => RecipeConfig` under `config.user.supertokens.recipes`. The function receives the Fastify instance, enabling access to config and decorators. Providing an object instead of a function merges the object into the default config.

14. **Override merging for `apis` and `functions`** — when a recipe override includes `override.apis` or `override.functions`, each key is called as `fn(originalImplementation, fastify)` and merged on top of the default implementation, so only the keys you provide are replaced.

15. **Email verification (opt-in)** — setting `config.user.features.signUp.emailVerification = true` adds the `EmailVerification` recipe and enforces the email-verified claim on protected routes. Default: `false`.

16. **Third-party OAuth providers** — Apple, Facebook, GitHub, and Google providers are configurable via `config.user.supertokens.providers`; custom providers are supported via `providers.custom`.

## User Management

17. **`GET /me`** — returns the authenticated user's profile. If a photo exists, the `photo.url` field is a pre-signed S3 URL. Session claims (email verification, profile validation) are bypassed so users can always read their own data.

18. **`PUT /me`** — updates mutable fields on the current user's profile. Session claims are bypassed.

19. **`POST /change-email`** — updates the authenticated user's email address. Gated by `config.user.features.updateEmail.enabled`. Session email-verification claims are bypassed on this route.

20. **`POST /change_password`** — validates the current password before updating. Requires a valid session.

21. **`DELETE /me` with atomic session revocation** — soft-deletes the user record (`deleted_at`) and immediately revokes all active SuperTokens sessions in the same operation. Requires password confirmation.

22. **`PUT /me/photo`** — accepts `multipart/form-data`, validates MIME type (`image/jpeg`, `image/png`, `image/webp`) and file size, uploads to `{userId}/photo` in the configured S3 bucket, and links the file record to the user. Session claims bypassed.

23. **`DELETE /me/photo`** — deletes the photo from S3 and unlinks it from the user record. Session claims bypassed.

24. **Configurable photo size limit** — `config.user.photoMaxSizeInMB` (default: `5`).

25. **`POST /signup/admin`** — public endpoint to create the first administrator account without an invitation.

26. **`GET /signup/admin`** — public endpoint returning `{ signUp: boolean }` indicating whether admin sign-up is currently available.

27. **`GET /users`** — paginatable list of all users. Requires `users:list` permission.

28. **`GET /users/:id`** — fetches a single user by ID. Requires `users:read` permission.

29. **`PUT /users/:id/disable`** — sets the user's `disabled` flag to `true`. Requires `users:disable` permission.

30. **`PUT /users/:id/enable`** — clears the user's `disabled` flag. Requires `users:enable` permission.

31. **Immutable field guard (`filterUserUpdateInput`)** — applied automatically before every profile update; silently drops any attempt to set `id`, `email`, `roles`, `lastLoginAt`, `signedUpAt`, `disable`, or `enable`. Handles both camelCase and snake_case variants (e.g. `last_login_at` is also stripped).

32. **Configurable table names** — `config.user.tables.users.name` and `config.user.tables.invitations.name` override the default table names.

33. **Custom request handlers** — every route handler can be replaced via `config.user.handlers.user.<handlerName>` or `config.user.handlers.invitation.<handlerName>`.

## Authorization

34. **`fastify.hasPermission(permission)` decorator** — added to the Fastify instance; returns a `preHandler` that checks the authenticated user holds the given permission. Returns 401 without a session, 403 without the permission.

35. **`hasUserPermission(fastify, userId, permission)` utility** — programmatic permission check; returns a boolean.

36. **SUPERADMIN bypass** — users with the `SUPERADMIN` role pass all `hasPermission` and `hasUserPermission` checks automatically, without being explicitly granted every permission.

37. **Built-in permission constants** — pre-defined strings to avoid typos:

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

38. **Application-defined custom permissions** — `config.user.permissions` registers additional permission strings returned by `GET /permissions`, making them discoverable by role-management UIs.

## Roles

39. **Built-in role constants** — `ROLE_ADMIN`, `ROLE_SUPERADMIN`, `ROLE_USER` are exported.

40. **`POST /roles`** — creates a new role with optional initial permissions. Requires a valid session.

41. **`DELETE /roles`** — deletes a role; returns `ROLE_IN_USE` error if any user holds it. Requires a valid session.

42. **`GET /roles`** — returns all roles with their permissions. Requires a valid session.

43. **`GET /roles/permissions`** — returns the permissions for a named role. Requires a valid session.

44. **`PUT /roles/permissions`** — replaces the permission set of a named role. Requires a valid session.

45. **`isRoleExists(name)` / `areRolesExist(names)` utilities** — programmatic existence checks against SuperTokens.

## Invitations

46. **`POST /invitations`** — creates an invitation record, validates the target email and role, checks for a duplicate pending invitation, and sends the invitation email. Requires `invitations:create` permission.

47. **Configurable invitation expiry** — `config.user.invitation.expireAfterInDays` sets how long an invitation is valid (default: `30`).

48. **Configurable accept link path** — `config.user.invitation.acceptLinkPath` sets the front-end path embedded in the invitation email (default: `"/signup/token/:token"`). The `:token` placeholder is replaced with the actual token.

49. **`GET /invitations/token/:token`** — public endpoint returning the invitation record for UI display before acceptance.

50. **`POST /invitations/token/:token`** — public endpoint that validates the invitation, creates a SuperTokens account, opens a session, and optionally calls `config.user.invitation.postAccept(request, invitation, user)`.

51. **`GET /invitations`** — paginatable list of all invitations. Requires `invitations:list` permission.

52. **`PUT /invitations/revoke/:id`** — marks an invitation as revoked. Requires `invitations:revoke` permission.

53. **`POST /invitations/resend/:id`** — re-sends the invitation email. Requires `invitations:resend` permission.

54. **`DELETE /invitations/:id`** — permanently removes an invitation record. Requires `invitations:delete` permission.

55. **`isInvitationValid(invitation)` utility** — returns `true` only when the invitation is pending, non-expired, non-revoked, and non-accepted.

56. **`computeInvitationExpiresAt(config, explicitDate?)` utility** — computes the expiry timestamp using the configured `expireAfterInDays`, or returns `explicitDate` when provided.

57. **`getOrigin(url)` utility** — extracts `scheme://host[:non-default-port]` from a URL string. Returns an empty string for bare hostnames, IP addresses without a scheme, relative paths, or any input that is not a full URL. Default ports (`80` / `443`) are stripped.

58. **`sendInvitation(fastify, invitation, origin)` utility** — sends the invitation email; usable from custom code that bypasses the REST route.

## Email

59. **`validateEmail(email, config)` utility** — validates an email string against `config.user.email` options using `validator.js`. Returns `{ success: true }` or `{ success: false, message }`. Gracefully falls back to permissive defaults when no email config is provided.

60. **Email domain whitelist / blacklist** — `config.user.email.host_whitelist` and `config.user.email.host_blacklist` restrict which domains are accepted during sign-up and invitation.

61. **Custom email subjects and templates** — `config.user.emailOverrides` overrides the subject and `templateName` for any of the five system emails: `invitation`, `resetPassword`, `resetPasswordNotification`, `emailVerification`, `duplicateEmail`.

62. **`sendEmail(options)` utility** — sends a templated email via `fastify.mailer`; accepts `{ fastify, subject, templateName, to, templateData }`.

63. **`verifyEmail(userId, email)` utility** — programmatically marks a user's email as verified in SuperTokens (useful for invited users who skip the verification link).

## Password

64. **`validatePassword(password, config)` utility** — validates password strength against `config.user.password` options. Returns `{ success: true }` or `{ success: false, message }` listing all failed requirements.

65. **Configurable strength thresholds** — `config.user.password` accepts `minLength` (default: `8`), `minLowercase`, `minUppercase`, `minNumbers`, `minSymbols` (all default to `0` unless configured), and scoring tuning fields (`pointsPerUnique`, `pointsPerRepeat`, `pointsForContaining*`).

## Profile Validation Claim

66. **`ProfileValidationClaim` custom session claim** — a SuperTokens `SessionClaim` that checks whether required profile fields are populated. Re-fetched on every request. Enable via `config.user.features.profileValidation.enabled = true` and list required fields in `features.profileValidation.fields`.

67. **Grace period** — `config.user.features.profileValidation.gracePeriodInDays` allows users to access protected resources for N days after sign-up before the claim is enforced. After the grace period, requests fail with 403.

68. **Per-route claim opt-out** — routes that must stay accessible regardless of profile completeness can bypass the claim via `verifySession({ overrideGlobalClaimValidators: () => [] })` (REST) or `@auth(profileValidation: false)` (GraphQL).

## GraphQL Integration

> Requires `config.graphql.enabled = true` and `@prefabs.tech/fastify-graphql`.

69. **MercuriusContext extended with `user` and `roles`** — `context.user: User | undefined` and `context.roles: string[] | undefined` are populated before each resolver via `plugin.updateContext`.

70. **`@auth` directive** — protects a field or mutation; checks (1) authenticated session, (2) non-disabled account, (3) email verified (if enabled, unless `emailVerification: false` is passed), (4) profile complete (if enabled, unless `profileValidation: false` is passed).

71. **`@hasPermission(permission)` directive** — enforces a named permission on a GraphQL field; SUPERADMIN bypasses automatically.

72. **User GraphQL types** — `User`, `Photo`, `Users` (paginated wrapper with `totalCount`, `filteredCount`, `data`).

73. **User queries** — `canAdminSignUp`, `me`, `user(id)`, `users(limit, offset, filters, sort)`.

74. **User mutations** — `adminSignUp`, `changeEmail`, `changePassword`, `deleteMe`, `disableUser`, `enableUser`, `removePhoto`, `updateMe`, `uploadPhoto`. The `uploadPhoto` mutation requires the GraphQL upload transport from `@prefabs.tech/fastify-graphql` (registered by default when the graphql plugin is enabled; configured via its `uploads` option).

75. **Invitation GraphQL types and operations** — `Invitation` type; queries `getInvitationByToken`, `listInvitation`; mutations `acceptInvitation`, `createInvitation`, `deleteInvitation`, `resendInvitation`, `revokeInvitation`.

76. **Role GraphQL types and operations** — `Role` type; queries `roles`, `rolePermissions`; mutations `createRole`, `deleteRole`, `updateRolePermissions`.

77. **`permissions` GraphQL query** — returns the configured permission strings.

78. **`userSchema` merged schema export** — the complete SDL string combining all user, invitation, role, and permission type definitions; ready to pass to `mergeTypeDefs`.

79. **Resolver exports** — `userResolver`, `invitationResolver`, `roleResolver`, `permissionResolver` are exported individually for spreading into a larger resolver map.

80. **Auth adapter layer** — handlers and middleware call `auth` (email/password, session, roles, claims, errors) instead of importing `supertokens-node` directly. Symbols are exported from the package root (`auth`, `getAuth`, `initAuth`, `AuthUser`, `AuthSession`, …).

81. **Configurable auth provider** — `config.user.authProvider` selects the provider implementation (default `"supertokens"`). Custom providers can be registered via `registerAuthProvider(name, provider)`.

82. **`supertokens-node` peer dependency (≥16)** — required when using the default SuperTokens provider. The peer is marked optional in `package.json` so apps with a fully custom `authProvider` may omit it; the default provider still expects `supertokens-node` to be installed.
