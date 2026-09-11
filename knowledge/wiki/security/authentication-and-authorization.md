---
type: Security
title: Authentication and Authorization
description: The trust boundaries of an app built on these packages and the controls on each (SuperTokens session transport and verification, user-state enforcement, claims, permission checks on REST and GraphQL, credential policies, App Check, and error disclosure).
tags: [security, authentication, authorization, supertokens, permissions, sessions]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: st-init
    resource: repo://packages/user/src/supertokens/init.ts#L10-L22
    title: SuperTokens appInfo and core connection
  - id: session-config
    resource: repo://packages/user/src/supertokens/recipes/config/sessionRecipeConfig.ts#L28-L32
    title: Token transfer method selection
  - id: cors-headers
    resource: repo://packages/user/src/constants.ts#L94-L103
    title: SUPERTOKENS_CORS_HEADERS
  - id: user-guide-setup
    resource: repo://packages/user/GUIDE.md#L54-L59
    title: CORS registration in setup
  - id: get-session
    resource: repo://packages/user/src/supertokens/recipes/config/session/getSession.ts#L19-L34
    title: checkDatabase default and user load
  - id: verify-session
    resource: repo://packages/user/src/supertokens/recipes/config/session/verifySession.ts#L14-L40
    title: Deleted/disabled revocation
  - id: create-session
    resource: repo://packages/user/src/supertokens/recipes/config/session/createNewSession.ts#L22-L50
    title: Session creation guard and profile claim
  - id: global-claims
    resource: repo://packages/user/src/supertokens/recipes/config/session/getGlobalClaimValidators.ts#L18-L28
    title: Profile validation as a global claim
  - id: has-permission
    resource: repo://packages/user/src/middlewares/hasPermission.ts#L8-L36
    title: REST permission preHandler
  - id: has-user-permission
    resource: repo://packages/user/src/lib/hasUserPermission.ts#L21-L43
    title: Permission decision
  - id: auth-directive
    resource: repo://packages/user/src/mercurius-auth/authPlugin.ts#L14-L96
    title: "@auth directive"
  - id: perm-directive
    resource: repo://packages/user/src/mercurius-auth/hasPermissionPlugin.ts#L11-L47
    title: "@hasPermission directive"
  - id: password-validator
    resource: repo://packages/user/src/validator/password.ts#L64-L83
    title: Password strength from config.user.password
  - id: email-validator
    resource: repo://packages/user/src/validator/email.ts#L5-L22
    title: Email validation from config.user.email
  - id: change-password
    resource: repo://packages/user/src/model/users/service.ts#L71-L125
    title: Password change re-authenticates and revokes sessions
  - id: delete-me
    resource: repo://packages/user/src/model/users/service.ts#L143-L164
    title: Account deletion requires password
  - id: third-party-gate
    resource: repo://packages/user/src/supertokens/recipes/config/third-party-email-password/thirdPartySignInUp.ts#L24-L32
    title: Third-party sign-up gate
  - id: refresh-cookie
    resource: repo://packages/user/src/supertokens/plugin.ts#L27-L53
    title: Refresh token cookie path
  - id: app-check
    resource: repo://packages/firebase/src/middlewares/verifyFirebaseAppCheck.ts#L5-L38
    title: Firebase App Check
  - id: phone-dev
    resource: repo://packages/phone-auth/src/recipe/config.ts#L45-L74
    title: Phone auth dev mode and bypass numbers
  - id: error-mask
    resource: repo://packages/error-handler/src/errorHandler.ts#L110-L131
    title: 500 response masking
  - id: s3-limit
    resource: repo://packages/s3/src/plugin.ts#L45-L49
    title: Multipart file size limit
  - id: photo-limit
    resource: repo://packages/user/src/model/users/service.ts#L257-L276
    title: Photo size and type limits
  - id: claude-md
    resource: repo://CLAUDE.md
    title: Escalation rule on auth semantics
---

# Authentication and Authorization

Names and mechanisms only. Changing any of these semantics in `packages/user` requires maintainer approval under CLAUDE.md's escalation rules.[^claude-md]

## Trust boundaries
| Boundary | Mechanism |
|----------|-----------|
| Browser/mobile client ↔ API | SuperTokens session tokens (cookies or headers), CORS |
| API ↔ SuperTokens core | `supertokens.connectionUri`[^st-init] |
| API ↔ Postgres, S3, Firebase, Twilio, SMTP | Credentials in the app's config object ([Secrets and credentials](secrets-and-credentials.md)) |
| Mobile app ↔ API (optional) | Firebase App Check token header |

## Session transport
- A request with `st-auth-mode: header` uses header-based tokens; every other request uses cookies.[^session-config]
- Browser clients need CORS to allow the SuperTokens headers: `anti-csrf`, `authorization`, `fdi-version`, `front-token`, `rid`, `st-access-token`, `st-auth-mode`, `st-refresh-token`. The package exports these as `SUPERTOKENS_CORS_HEADERS`.[^cors-headers] The documented setup registers `@fastify/cors` with those headers and `credentials: true`.[^user-guide-setup]
- `supertokens.refreshTokenCookiePath` narrows the `Path` of the `sRefreshToken` cookie through an `onSend` rewrite.[^refresh-cookie]

## Session verification (REST)
`fastify.verifySession()` is the preHandler used on authenticated routes. On top of SuperTokens' own verification:
1. `checkDatabase` defaults to **true**, configurable with `checkSessionInDatabase`.[^get-session]
2. The app user row is loaded into `request.user`.[^get-session]
3. A user with `deletedAt` or `disabled` has the session **revoked** and gets a 401.[^verify-session] New sessions are refused for such users at creation.[^create-session]
4. Global claim validators run:
   - **Email verification**, when `features.signUp.emailVerification` is on.
   - **Profile validation**, when `features.profileValidation.enabled` is on.[^global-claims]

   Routes the user needs in order to fix their state (for example `/me`) opt out of these two claims explicitly.

## Authorization
**REST.** `fastify.hasPermission(p)` placed after `verifySession()`:[^has-permission]
- No user → 401 (`UNAUTHORISED`).
- Permission denied → 403 (`INVALID_CLAIMS`).

**GraphQL.**
- `@auth` requires `context.user` and `!disabled`, then enforces email verification and profile validation unless the directive argument disables them.[^auth-directive]
- `@hasPermission(permission)` applies the same decision as REST.[^perm-directive]
- Details: [GraphQL request lifecycle](../architecture/graphql-request-lifecycle.md#3-directives).

**The decision (`hasUserPermission`):**[^has-user-permission]
| Condition | Result |
|-----------|--------|
| permission not listed in `config.user.permissions` | **allow** |
| user has role `SUPERADMIN` | allow |
| any of the user's roles carries the permission (from SuperTokens UserRoles) | allow |
| otherwise | deny |

A guard only restricts access once its permission name is declared in `config.user.permissions`. Authorization inside a handler, such as "does this user own this device?", is written per handler or resolver; for example the firebase `removeUserDevice` mutation checks ownership.

## Credential and account policies
- **Password strength** comes from a zod schema driven by `config.user.password` (`StrongPasswordOptions`: minimum length, lowercase, uppercase, numbers, symbols).[^password-validator] It applies to admin sign-up, invitation accept and password change.
- **Email validation** comes from `config.user.email` (`IsEmailOptions`), including domain restrictions per the GUIDE.[^email-validator]
- **Password change** verifies the old password with a sign-in call, then revokes **all** the user's sessions.[^change-password]
- **Account deletion** requires the current password and soft-deletes the user; `postDelete` revokes all sessions.[^delete-me]
- **Third-party sign-up** can be switched off with `features.signUp.enabled === false`. Existing third-party users can still sign in.[^third-party-gate]

## Optional controls in other packages
- **Firebase App Check.** `verifyFirebaseAppCheck` verifies `x-firebase-appcheck` on an explicit list of paths (exact match, query string ignored) when `firebase.appCheck.enabled`. Missing or invalid tokens get 403. It is not registered automatically.[^app-check]
- **Phone auth dev mode.** `enableDevMode` accepts `devModeOtp` for every number, and `bypassSmsFor` does so for listed numbers, skipping Twilio Verify. Both are configuration switches; boot requires `devModeOtp` whenever dev mode is on.[^phone-dev]

## Information disclosure and input limits
- The error-handler masks unhandled 500s (generic code, name and message, no stack) unless `stackTrace: true`.[^error-mask]
- REST multipart file size is unlimited (`Infinity`) unless `s3.fileSizeLimitInBytes` is set.[^s3-limit] Profile photos are limited separately (default 5 MB; jpeg, png, webp).[^photo-limit] GraphQL upload limits come from `graphql.uploads` (`maxFileSize`, `maxFiles`).

[^st-init]: `supertokens: { connectionURI: config.user.supertokens.connectionUri }`.
[^session-config]: `input.req.getHeaderValue("st-auth-mode") === "header" ? "header" : "cookie"`.
[^cors-headers]: Eight header names.
[^user-guide-setup]: `allowedHeaders: SUPERTOKENS_CORS_HEADERS, credentials: true, origin: true` in the GUIDE example.
[^get-session]: `checkDatabase: config.user.supertokens.checkSessionInDatabase ?? true`.
[^verify-session]: `session.revokeSession()`, then `httpErrors.unauthorized`.
[^create-session]: Throws "User not found" or "User is disabled" before `originalImplementation.createNewSession`.
[^global-claims]: Adds `ProfileValidationClaim().validators.isVerified()`.
[^has-permission]: `STError` with type `UNAUTHORISED` or `INVALID_CLAIMS`.
[^has-user-permission]: The code comments state the first two allow rules.
[^auth-directive]: Checks in the order listed.
[^perm-directive]: Same `hasUserPermission` call with `context.app`.
[^password-validator]: `passwordSchema(messages, config.user.password)`.
[^email-validator]: `emailSchema(messages, config.user.email)`.
[^change-password]: `Session.revokeAllSessionsForUser(userId)` after a successful update.
[^delete-me]: Calls `emailPasswordSignIn` with the provided password before `delete`.
[^third-party-gate]: `if (!thirdPartyUser && config.user.features?.signUp?.enabled === false) throw notFound`.
[^refresh-cookie]: Replaces `Path=/...` on cookies starting with `sRefreshToken`.
[^app-check]: `getAppCheck().verifyToken(appCheckHeader)`.
[^phone-dev]: Throws at boot if `enableDevMode` is set without `devModeOtp`.
[^error-mask]: `code`, `message` and `name` replaced unless `isStackTraceEnabled`.
[^s3-limit]: `fileSize: options.fileSizeLimitInBytes || Infinity`.
[^photo-limit]: `DEFAULT_USER_PHOTO_MAX_SIZE_IN_MB` and `_supportedMimeTypes`.
[^claude-md]: "Stop and ask" item 4.
