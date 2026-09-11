---
type: Explainer
title: SuperTokens Integration Model
description: The SuperTokens concepts the user and phone-auth packages assume (core vs SDK, recipes, single init, apis vs functions overrides, userContext), how this repo layers its overrides, and what a consumer override replaces.
tags: [supertokens, reference, recipes, overrides, user-context]
status: draft
stale_after: 2027-03-11
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: st-init
    resource: repo://packages/user/src/supertokens/init.ts#L7-L25
    title: supertokens.init
  - id: recipes
    resource: repo://packages/user/src/supertokens/recipes/index.ts#L9-L27
    title: Recipe list
  - id: init-session
    resource: repo://packages/user/src/supertokens/recipes/initSessionRecipe.ts#L9-L18
    title: Function form replaces the generated config
  - id: init-roles
    resource: repo://packages/user/src/supertokens/recipes/initUserRolesRecipe.ts#L9-L16
    title: userRoles only accepts the function form
  - id: session-config
    resource: repo://packages/user/src/supertokens/recipes/config/sessionRecipeConfig.ts#L15-L95
    title: Session override layering
  - id: tpep-config
    resource: repo://packages/user/src/supertokens/recipes/config/thirdPartyEmailPasswordRecipeConfig.ts#L24-L142
    title: ThirdPartyEmailPassword override layering
  - id: get-session
    resource: repo://packages/user/src/supertokens/recipes/config/session/getSession.ts#L16-L33
    title: userContext._default.request.request
  - id: create-session
    resource: repo://packages/user/src/supertokens/recipes/config/session/createNewSession.ts#L19-L20
    title: getRequestFromUserContext
  - id: admin-signup
    resource: repo://packages/user/src/model/users/handlers/adminSignUp.ts#L59-L70
    title: Hand-built userContext with roles and autoVerifyEmail
  - id: signup
    resource: repo://packages/user/src/supertokens/recipes/config/third-party-email-password/emailPasswordSignUp.ts#L23-L77
    title: userContext.roles and autoVerifyEmail consumed
  - id: phone-config
    resource: repo://packages/phone-auth/src/recipe/config.ts#L100-L106
    title: userContext.phoneNumber
  - id: has-permission
    resource: repo://packages/user/src/middlewares/hasPermission.ts#L14-L34
    title: SuperTokens error types for 401/403
  - id: user-pkg
    resource: repo://packages/user/package.json
    title: supertokens-node 14.1.4 pin
  - id: claude-md
    resource: repo://CLAUDE.md
    title: Escalation rules (supertokens-node major bumps, auth semantics)
  - id: supertokens-docs
    resource: https://supertokens.com/docs
    title: SuperTokens documentation (external)
---

# SuperTokens Integration Model

For the full SuperTokens model, see the vendor docs.[^supertokens-docs] This page explains only the parts the repository's code depends on, and how the repository layers its own behaviour on top. It is pinned to `supertokens-node` **14.1.4**, with peer `>=14.1.4`.[^user-pkg] Revisit it when that version moves; a major bump needs maintainer approval.[^claude-md]

## Core vs SDK
- The **SuperTokens core** is a separate service. It stores users, sessions, roles and permissions, and is reached at `config.user.supertokens.connectionUri`.
- The **SDK** (`supertokens-node`) runs inside the API. `init()` passes `appInfo` (`apiDomain = baseUrl`, `websiteDomain = appOrigin[0]`, `apiBasePath`), `framework: "fastify"`, the recipe list, and only `connectionURI` for the core.[^st-init]

## Recipes and the single `init`
A recipe is a feature module. This repo uses:[^recipes]
- **session**
- **thirdpartyemailpassword**: email/password and OAuth providers in one recipe, as in the 14.x line.
- **userroles**
- **emailverification**, when enabled
- **passwordless**, contributed by phone-auth through `addSupertokensRecipe`

`init()` runs once per process, which is why recipe-contributing plugins must register first ([troubleshooting](../troubleshooting/supertokens-already-initialised.md)).

## `apis` vs `functions` overrides
- `override.apis` wraps **HTTP endpoint handlers**, for example `emailPasswordSignUpPOST` and `consumeCodePOST`.
- `override.functions` wraps **recipe logic**, for example `emailPasswordSignUp`, `createNewSession` and `getSession`, which also runs when code calls the recipe directly.

This repo attaches most behaviour at the `functions` level (sign-up, sign-in, session creation and loading), so it applies whichever endpoint or handler triggered it.

## How this repo layers overrides (and what yours replace)
Each recipe's config value can take two forms:
1. **A function `(fastify) => RecipeConfig`**: **replaces the package's generated config entirely**, including all its overrides.[^init-session] `userRoles` accepts only this form.[^init-roles]
2. **An object**: merged. The package builds `override.apis` and `override.functions` like this:[^session-config][^tpep-config]
   ```ts
   return {
     ...originalImplementation,        // SuperTokens defaults
     emailPasswordSignUp: ours(originalImplementation, fastify),
     ...consumerWrappers,              // yours, applied LAST
   };
   ```
   A consumer wrapper is called as `wrapper(originalImplementation, fastify)`. **`originalImplementation` is SuperTokens' own implementation, not the package's override.** Overriding `emailPasswordSignUp` therefore **drops** the package's `users` row creation, role assignment and verification email unless you reimplement them.
   - `thirdPartyEmailPassword.sendEmail` likewise replaces the package's reset-password email sender.[^tpep-config]

## `userContext` conventions
`userContext` is SuperTokens' per-call bag. This repo relies on these keys:

| Key | Set by | Read by |
|-----|--------|---------|
| `_default.request.request` (the Fastify request) | the SuperTokens framework adapter; hand-built in `adminSignUp`[^admin-signup] | `getSession` override writes `request.user` here[^get-session] |
| via `getRequestFromUserContext(userContext).original` | the SDK | `createNewSession`, `getGlobalClaimValidators`, `ProfileValidationClaim`[^create-session] |
| `roles` | admin sign-up, invitation accept, phone-auth `consumeCodePOST` | sign-up overrides[^signup] |
| `autoVerifyEmail` | admin sign-up, invitation accept | `emailPasswordSignUp`[^signup] |
| `phoneNumber` | phone-auth `createCodePOST` | `getCustomUserInputCode`[^phone-config] |

## Errors
SuperTokens errors carry a `type`:
- `UNAUTHORISED` → 401
- `INVALID_CLAIMS` → 403
- `TRY_REFRESH_TOKEN` → 401 with a refresh hint

The package throws `new STError({ type, payload })` from `hasPermission`, so SuperTokens' error handler produces the response.[^has-permission] That handler has to be installed, either directly or through error-handler's `preErrorHandler` ([Plugin registration order](../architecture/plugin-registration-order.md#two-root-error-handlers)).

## Data location
The app's user queries join `"public"."st__user_roles"`. The package therefore expects SuperTokens' role tables to be readable in the app's database ([user component](../components/user.md#data)).

[^st-init]: `supertokens: { connectionURI }`, with no other core settings.
[^recipes]: L10-24.
[^init-session]: `if (typeof session === "function") return Session.init(session(fastify))`.
[^init-roles]: `if (recipes && recipes.userRoles) return UserRoles.init(recipes.userRoles(fastify))`.
[^session-config]: Spread order in `apis` L54-58 and `functions` L81-90.
[^tpep-config]: `emailDelivery.override` L39-54; spread order L77-92 and L115-134.
[^get-session]: `input.userContext._default.request.request.user = user`.
[^create-session]: `getRequestFromUserContext(input.userContext)?.original`.
[^admin-signup]: `{ _default: { request: { request } }, autoVerifyEmail: true, roles: [...] }`.
[^signup]: `input.userContext.roles` L23; `input.userContext.autoVerifyEmail` L75.
[^phone-config]: `input.userContext.phoneNumber = input.phoneNumber`.
[^has-permission]: `type: "UNAUTHORISED"` and `type: "INVALID_CLAIMS"`.
[^user-pkg]: Dev pin `supertokens-node` 14.1.4.
[^claude-md]: "Stop and ask" items 4 and 6.
[^supertokens-docs]: External vendor documentation; not ingested.
