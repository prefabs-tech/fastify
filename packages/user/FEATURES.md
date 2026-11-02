<!-- Structured feature inventory — used by automated test generation. Developer docs: see GUIDE.md -->

# @prefabs.tech/fastify-user — Features

## Plugin Lifecycle

1. **Configurable route prefix** — all route modules are registered under `config.user.routePrefix`.

2. **Selective route module disabling** — each of the four route groups (`users`, `invitations`, `roles`, `permissions`) can be disabled independently via `routes.<group>.disabled = true`. The service layer is unaffected.

3. **Automatic database migrations** — on registration, runs `CREATE TABLE IF NOT EXISTS` for the `users` and `invitations` tables before the server is ready.

4. **Default role seeding** — on `onReady`, seeds `ADMIN`, `SUPERADMIN`, and `USER` into SuperTokens, plus any extra roles listed in `config.user.roles`.

5. **SuperTokens recipe registry** — `addSupertokensRecipe(fastify, factory)` lets another plugin contribute a SuperTokens recipe. Factories are collected on the `fastify.supertokensRecipes` decorator and drained by `getRecipeList` during `supertokens.init()`. Since SuperTokens allows exactly one global `init()` and this package performs it during its own registration, contributing plugins must be registered **before** it; `addSupertokensRecipe` throws once `fastify.supertokensInitialized` is set. Used by `@prefabs.tech/fastify-phone-auth`.

## Authentication

6. **`fastify.verifySession()` decorator** — added to the Fastify instance; use it as a `preHandler` to require a valid SuperTokens session on any route.

7. **`req.session` request property** — `FastifyRequest` is augmented with an optional `session` property (populated by SuperTokens after `verifySession` runs).

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

15. **Email verification (opt-in)** — setting `config.user.features.signUp.emailVerification = true` adds the `EmailVerification` recipe and enforces the email-verified claim on protected routes. Default: `false`. A route opts out of the email-verified claim (only) with the Fastify route option `config: { verified: false }`; omitting it or `verified: true` keeps the claim enforced. Equivalent of `meta.verified: false` in `@prefabs.tech/vue-user`.

16. **Route authentication hook** — an `onRequest` hook on the instance requires a SuperTokens session on every route not marked `config: { public: true }`, verifying it as `fastify.verifySession()` does (sets `request.user`, refuses deleted and disabled users, answers expired tokens with the refresh response). On by default; `config.user.middlewareEnabled: false` removes it. Requests that match no route are not checked, so unknown URLs stay 404 and SuperTokens' `/auth/*` endpoints work.

17. **`authenticateRoute` export** — the hook itself, for adding to chosen routers with `router.addHook("onRequest", authenticateRoute)` when `middlewareEnabled` is `false`.

18. **`profileValidated: false` route config** — lets a user whose profile isn't complete reach the route, as `verified: false` does for an unverified email; read by the hook and by `verifySession`.

19. **Route access declared in config on fastify-user's own routes** — invitation-by-token and admin sign-up routes are `public`; routes guarded by `fastify.hasPermission` name that `permission` (colon names); the others set `permissionMiddleware: false`. The `permission` and `permissionMiddleware` fields are declared on `FastifyContextConfig` for an access-control library's route hook to read.

20. **Third-party OAuth providers** — Apple, Facebook, GitHub, and Google providers are configurable via `config.user.supertokens.providers`; custom providers are supported via `providers.custom`.

## User Management

21. **`GET /me`** — returns the authenticated user's profile. If a photo exists, the `photo.url` field is a pre-signed S3 URL. Session claims (email verification, profile validation) are bypassed so users can always read their own data.

22. **`PUT /me`** — updates mutable fields on the current user's profile. Session claims are bypassed.

23. **`POST /change-email`** — updates the authenticated user's email address. Gated by `config.user.features.updateEmail.enabled`. Session email-verification claims are bypassed on this route.

24. **`POST /change_password`** — validates the current password before updating. Requires a valid session.

25. **`DELETE /me` with atomic session revocation** — soft-deletes the user record (`deleted_at`) and immediately revokes all active SuperTokens sessions in the same operation. Requires password confirmation.

26. **`PUT /me/photo`** — accepts `multipart/form-data`, validates MIME type (`image/jpeg`, `image/png`, `image/webp`) and file size, uploads to `{userId}/photo` in the configured S3 bucket, and links the file record to the user. Session claims bypassed.

27. **`DELETE /me/photo`** — deletes the photo from S3 and unlinks it from the user record. Session claims bypassed.

28. **Configurable photo size limit** — `config.user.photoMaxSizeInMB` (default: `5`).

29. **`POST /signup/admin`** — public endpoint to create the first administrator account without an invitation.

30. **`GET /signup/admin`** — public endpoint returning `{ signUp: boolean }` indicating whether admin sign-up is currently available.

31. **`GET /users`** — paginatable list of all users. Requires `users:list` permission.

32. **`GET /users/:id`** — fetches a single user by ID. Requires `users:read` permission.

33. **`PUT /users/:id/disable`** — sets the user's `disabled` flag to `true`. Requires `users:disable` permission.

34. **`PUT /users/:id/enable`** — clears the user's `disabled` flag. Requires `users:enable` permission.

35. **Immutable field guard (`filterUserUpdateInput`)** — applied automatically before every profile update; silently drops any attempt to set `id`, `email`, `roles`, `lastLoginAt`, `signedUpAt`, `disable`, or `enable`. Handles both camelCase and snake_case variants (e.g. `last_login_at` is also stripped).

36. **Configurable table names** — `config.user.tables.users.name` and `config.user.tables.invitations.name` override the default table names.

37. **Custom request handlers** — every route handler can be replaced via `config.user.handlers.user.<handlerName>` or `config.user.handlers.invitation.<handlerName>`.

## Authorization

38. **`fastify.hasPermission(permission, { context? })` decorator** — added to the Fastify instance; returns a `preHandler` that checks the authenticated user holds the given permission. `context(request)`, sync or async, returns the object the check is made against. Returns 401 without a session, 403 without the permission.

39. **`hasUserPermission(fastify, userId, permission)` utility** — programmatic permission check; returns a boolean.

40. **SUPERADMIN bypass** — users with the `SUPERADMIN` role pass all `hasPermission` and `hasUserPermission` checks automatically, without being explicitly granted every permission. Not when `config.user.accessControl.hasPermission` is set.

41. **Built-in permission constants** — pre-defined strings to avoid typos:

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

42. **Application-defined custom permissions** — `config.user.permissions` registers additional permission strings returned by `GET /permissions`, making them discoverable by role-management UIs.

43. **Grants with the signed-in user** — when `config.user.accessControl.getGrants(user, fastify)` is set, the user returned by email and password sign-in and sign-up, third-party sign-in, accepting an invitation and `GET /me` carries `grants`, the list it returns. When it throws, the request fails. Unset, responses are unchanged.

44. **App-supplied permission check** — when `config.user.accessControl.hasPermission(request, permission, context)` is set, it decides every check made by `fastify.hasPermission`, `request.hasPermission` and the `@hasPermission` directive, with the context (`{}` when none is given); SuperTokens roles, `config.user.permissions` and the SUPERADMIN bypass no longer apply. When it throws, the request fails. Unset, checks are unchanged. `config.user.accessControl.mapPermissionName(permission)` renames each permission before it reaches the check (`users:list` to `users.list`, for a library that splits names on dots); it is ignored without `config.user.accessControl.hasPermission`.

45. **`request.hasPermission(permission, context?)`** — the same check as a boolean, for code that needs the answer without refusing the request. `false` without a user.

46. **A user's roles in the library (`config.user.accessControl.admin`)** — an object implementing `AccessControlAdmin` (exported type): `getUserRoles` reads a user's roles by name and `setUserRoles` replaces them. Each method takes the request. Used by `roleMap`. Its type, with `AccessControlProvider` and `User`, is also exported from the types-only entry `@prefabs.tech/fastify-user/access-control-provider`, which loads no augmentation of Fastify.

47. **The library's roles at sign-up (`config.user.accessControl.roleMap`)** — maps each SuperTokens role to the library's roles. Email and password sign-up, third-party sign-up of a new user, admin sign-up and accepting an invitation (REST and GraphQL) give the SuperTokens roles as before, then the mapped roles through `admin.getUserRoles` and `admin.setUserRoles`, kept alongside any the user holds. They are given before the response's `grants` are read and before `invitation.postAccept` runs. A failure, or a sign-up called without a request, is logged and the sign-up still succeeds. Registration fails when `roleMap` is set without an `admin` object, or when it doesn't map each role to an array of names. Unset, sign-up is unchanged.

## Roles

48. **Built-in role constants** — `ROLE_ADMIN`, `ROLE_SUPERADMIN`, `ROLE_USER` are exported.

49. **`POST /roles`** — creates a new role with optional initial permissions. Requires a valid session.

50. **`DELETE /roles`** — deletes a role; returns `ROLE_IN_USE` error if any user holds it. Requires a valid session.

51. **`GET /roles`** — returns all roles with their permissions. Requires a valid session.

52. **`GET /roles/permissions`** — returns the permissions for a named role. Requires a valid session.

53. **`PUT /roles/permissions`** — replaces the permission set of a named role. Requires a valid session.

54. **`isRoleExists(name)` / `areRolesExist(names)` utilities** — programmatic existence checks against SuperTokens.

## Invitations

55. **`POST /invitations`** — creates an invitation record, validates the target email and role, checks for a duplicate pending invitation, and sends the invitation email. Requires `invitations:create` permission.

56. **Configurable invitation expiry** — `config.user.invitation.expireAfterInDays` sets how long an invitation is valid (default: `30`).

57. **Configurable accept link path** — `config.user.invitation.acceptLinkPath` sets the front-end path embedded in the invitation email (default: `"/signup/token/:token"`). The `:token` placeholder is replaced with the actual token.

58. **`GET /invitations/token/:token`** — public endpoint returning the invitation record for UI display before acceptance.

59. **`POST /invitations/token/:token`** — public endpoint that validates the invitation, creates a SuperTokens account, opens a session, and optionally calls `config.user.invitation.postAccept(request, invitation, user)`.

60. **`GET /invitations`** — paginatable list of all invitations. Requires `invitations:list` permission.

61. **`PUT /invitations/revoke/:id`** — marks an invitation as revoked. Requires `invitations:revoke` permission.

62. **`POST /invitations/resend/:id`** — re-sends the invitation email. Requires `invitations:resend` permission.

63. **`DELETE /invitations/:id`** — permanently removes an invitation record. Requires `invitations:delete` permission.

64. **`isInvitationValid(invitation)` utility** — returns `true` only when the invitation is pending, non-expired, non-revoked, and non-accepted.

65. **`computeInvitationExpiresAt(config, explicitDate?)` utility** — computes the expiry timestamp using the configured `expireAfterInDays`, or returns `explicitDate` when provided.

66. **`getOrigin(url)` utility** — extracts `scheme://host[:non-default-port]` from a URL string. Returns an empty string for bare hostnames, IP addresses without a scheme, relative paths, or any input that is not a full URL. Default ports (`80` / `443`) are stripped.

67. **`sendInvitation(fastify, invitation, origin)` utility** — sends the invitation email; usable from custom code that bypasses the REST route.

## Email

68. **`validateEmail(email, config)` utility** — validates an email string against `config.user.email` options using `validator.js`. Returns `{ success: true }` or `{ success: false, message }`. Gracefully falls back to permissive defaults when no email config is provided.

69. **Email domain whitelist / blacklist** — `config.user.email.host_whitelist` and `config.user.email.host_blacklist` restrict which domains are accepted during sign-up and invitation.

70. **Custom email subjects and templates** — `config.user.emailOverrides` overrides the subject and `templateName` for any of the five system emails: `invitation`, `resetPassword`, `resetPasswordNotification`, `emailVerification`, `duplicateEmail`.

71. **`sendEmail(options)` utility** — sends a templated email via `fastify.mailer`; accepts `{ fastify, subject, templateName, to, templateData }`.

72. **`verifyEmail(userId, email)` utility** — programmatically marks a user's email as verified in SuperTokens (useful for invited users who skip the verification link).

## Password

73. **`validatePassword(password, config)` utility** — validates password strength against `config.user.password` options. Returns `{ success: true }` or `{ success: false, message }` listing all failed requirements.

74. **Configurable strength thresholds** — `config.user.password` accepts `minLength` (default: `8`), `minLowercase`, `minUppercase`, `minNumbers`, `minSymbols` (all default to `0` unless configured), and scoring tuning fields (`pointsPerUnique`, `pointsPerRepeat`, `pointsForContaining*`).

## Profile Validation Claim

75. **`ProfileValidationClaim` custom session claim** — a SuperTokens `SessionClaim` that checks whether required profile fields are populated. Re-fetched on every request. Enable via `config.user.features.profileValidation.enabled = true` and list required fields in `features.profileValidation.fields`.

76. **Grace period** — `config.user.features.profileValidation.gracePeriodInDays` allows users to access protected resources for N days after sign-up before the claim is enforced. After the grace period, requests fail with 403.

77. **Per-route claim opt-out** — routes that must stay accessible regardless of profile completeness can bypass the claim with the route config `profileValidated: false`, or `verifySession({ overrideGlobalClaimValidators: () => [] })` (REST), or `@auth(profileValidation: false)` (GraphQL).

## GraphQL Integration

> Requires `config.graphql.enabled = true` and `@prefabs.tech/fastify-graphql`.

78. **MercuriusContext extended with `user` and `roles`** — `context.user: User | undefined` and `context.roles: string[] | undefined` are populated before each resolver via `plugin.updateContext`.

79. **`@auth` directive** — protects a field or mutation; checks (1) authenticated session, (2) non-disabled account, (3) email verified (if enabled, unless `emailVerification: false` is passed), (4) profile complete (if enabled, unless `profileValidation: false` is passed).

80. **`@hasPermission(permission)` directive** — enforces a named permission on a GraphQL field, through `config.user.accessControl.hasPermission` when set; otherwise SUPERADMIN bypasses automatically.

81. **User GraphQL types** — `User`, `Photo`, `Users` (paginated wrapper with `totalCount`, `filteredCount`, `data`).

82. **User queries** — `canAdminSignUp`, `me`, `user(id)`, `users(limit, offset, filters, sort)`.

83. **User mutations** — `adminSignUp`, `changeEmail`, `changePassword`, `deleteMe`, `disableUser`, `enableUser`, `removePhoto`, `updateMe`, `uploadPhoto`. The `uploadPhoto` mutation requires the GraphQL upload transport from `@prefabs.tech/fastify-graphql` (registered by default when the graphql plugin is enabled; configured via its `uploads` option).

84. **Invitation GraphQL types and operations** — `Invitation` type; queries `getInvitationByToken`, `listInvitation`; mutations `acceptInvitation`, `createInvitation`, `deleteInvitation`, `resendInvitation`, `revokeInvitation`.

85. **Role GraphQL types and operations** — `Role` type; queries `roles`, `rolePermissions`; mutations `createRole`, `deleteRole`, `updateRolePermissions`.

86. **`permissions` GraphQL query** — returns the configured permission strings.

87. **`userSchema` merged schema export** — the complete SDL string combining all user, invitation, role, and permission type definitions; ready to pass to `mergeTypeDefs`.

88. **Resolver exports** — `userResolver`, `invitationResolver`, `roleResolver`, `permissionResolver` are exported individually for spreading into a larger resolver map.
