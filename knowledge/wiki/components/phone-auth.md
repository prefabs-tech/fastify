---
type: Component
title: fastify-phone-auth
description: The passwordless phone login package, which contributes a SuperTokens passwordless recipe through the user package's recipe registry, bridges SuperTokens to Twilio Verify with a placeholder code, and supports dev-mode and bypass numbers.
tags: [phone-auth, passwordless, twilio, supertokens, package]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: index
    resource: repo://packages/phone-auth/src/index.ts#L3-L24
    title: Augmentations and exports
  - id: plugin
    resource: repo://packages/phone-auth/src/plugin.ts#L10-L31
    title: Plugin
  - id: types
    resource: repo://packages/phone-auth/src/types.ts#L16-L71
    title: PhoneAuthConfig
  - id: constants
    resource: repo://packages/phone-auth/src/constants.ts#L1-L18
    title: Placeholder code
  - id: recipe-config
    resource: repo://packages/phone-auth/src/recipe/config.ts#L19-L184
    title: Passwordless recipe config
  - id: consume-code-post
    resource: repo://packages/phone-auth/src/recipe/consumeCodePost.ts#L10-L113
    title: consumeCodePOST override (Twilio check)
  - id: consume-code
    resource: repo://packages/phone-auth/src/recipe/consumeCode.ts#L17-L123
    title: consumeCode override (users row)
  - id: queries
    resource: repo://packages/phone-auth/src/migrations/queries.ts#L7-L16
    title: phone_number column
  - id: extend-schema
    resource: repo://packages/phone-auth/src/graphql/extendUserSchema.ts#L3-L21
    title: GraphQL User extension
  - id: twilio
    resource: repo://packages/phone-auth/src/lib/getTwilioClient.ts#L5-L30
    title: Twilio client validation
  - id: guide
    resource: repo://packages/phone-auth/GUIDE.md#L25-L42
    title: GUIDE, registration order
  - id: test
    resource: repo://packages/phone-auth/src/__test__/plugin.test.ts#L45-L99
    title: Plugin tests
  - id: pkg
    resource: repo://packages/phone-auth/package.json#L30-L53
    title: Package scripts and vitest pin
  - id: commit-created
    resource: repo://packages/phone-auth/package.json
    title: "Commit eccaaa67, 2026-08-04: Feat/phone auth package (#1147)"
---

# fastify-phone-auth

**Responsibility:** let users sign in or up with a phone number and an SMS one-time code, creating the same app `users` row and roles as other sign-up paths. It is the newest package, added in commit `eccaaa67` on 2026-08-04,[^commit-created] and the first consumer of the [user](user.md) package's recipe registry.

## Registration (reads `fastify.config.phoneAuth`)
- With `enabled === false`, it logs and returns.[^plugin]
- Otherwise it calls `addSupertokensRecipe(fastify, initPasswordlessRecipe)`. **It must be registered before user**, or registration throws.[^guide][^test]
- `onReady`:
  - `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20)`.[^queries]
  - `extend type User { phoneNumber: String }`, skipped when `fastify.graphql` or its `User` type is missing.[^extend-schema]

The code comment explains why this waits for `onReady`: the users table is created while user registers, which happens after this plugin.[^plugin]

## Why a placeholder code
SuperTokens has no first-class Twilio Verify support, yet it insists on storing its own user-input code. The recipe hands it `TWILIO_VERIFY_PLACEHOLDER_CODE` (`"000000"`), lets Twilio Verify own the real OTP, and replays the placeholder once Twilio approves.[^constants][^recipe-config]

```
createCodePOST  → phoneNumber copied into userContext → SuperTokens stores placeholder code
sendSms         → Twilio Verify verifications.create(channel: "sms")
consumeCodePOST → Twilio verificationChecks.create(code) → "approved"?
                    yes → original consumeCodePOST with userInputCode = "000000"
                    no  → INCORRECT_USER_INPUT_CODE_ERROR
consumeCode     → create users row (+ roles) or update last_login_at
```

## Dev mode and bypass numbers
| Setting | Effect |
|---------|--------|
| `enableDevMode: true` | No SMS is sent; `devModeOtp` is the code for every number. `devModeOtp` is required, else boot throws. The OTP is logged at info level when a code would have been sent.[^recipe-config] |
| `bypassSmsFor: [numbers]` | Those numbers skip Twilio, both send and check, and use `devModeOtp`.[^recipe-config][^consume-code-post] |
| neither | `getTwilioClient` is called **at boot**, so missing `accountSid`/`authToken`/`verifyServiceSid` fail startup instead of the first login.[^recipe-config][^twilio] |

## User row creation (`consumeCode`)
- Roles are `userContext.roles`, or `[config.user.role || "USER"]`, and must exist.[^consume-code]
- SuperTokens requires an email, so the row gets a synthetic `<phoneNumber>@<fallbackEmailDomain>`. The domain defaults to the lowercased, whitespace-stripped `appName` plus `.com`.[^consume-code]
- If the row insert fails, or the phone number or email is missing, the SuperTokens user is deleted.[^consume-code]
- The package augments `@prefabs.tech/fastify-user`'s `User` with `phoneNumber?`.[^index]

## Observed inconsistencies
- `consumeCodePOST.enrichResult` fills a missing email as `<phone>@${fallbackEmailDomain ?? ""}`, without the appName default that `consumeCode` uses.[^consume-code-post][^consume-code] With no `fallbackEmailDomain` configured, the email returned by the API response and the one stored on the users row can differ.
- A rejected Twilio check always reports `failedCodeInputAttemptCount: 1` and `maximumCodeInputAttempts: 5`. These are constants, not tracked values.[^consume-code-post]
- The package pins vitest 3.2.7 while the others use 4.1.10.[^pkg]

## Escape hatches
`override.apis` and `override.functions` wrap individual methods. `recipe: (fastify) => PasswordlessRecipeConfig` replaces the whole generated config.[^types]

## Tests
`plugin.test.ts` covers the flag behaviour, `onReady` timing and ordering errors.[^test] `recipeConfig.spec.ts` and `extendUserSchema.test.ts` cover the rest.

[^plugin]: Comment L21-24.
[^guide]: "Registration order — read this first".
[^test]: "throws when registered after SuperTokens has already been initialised".
[^queries]: Table name from `config.user.tables.users.name` or `users`.
[^extend-schema]: `if (!fastify.graphql?.schema?.getType("User")) return;`.
[^constants]: The comment on L8-10 explains the placeholder.
[^recipe-config]: Comment L19-32; dev checks L45-61; boot-time Twilio validation L58-61; SMS override L146-181.
[^consume-code-post]: Bypass L65-73; the Twilio check result is handled on L93-106.
[^consume-code]: Roles L22-31; email domain L50-56; compensating deletes L58-62 and L73-80.
[^twilio]: Throws descriptive errors for each missing field.
[^index]: `declare module "@prefabs.tech/fastify-user" { interface User { phoneNumber?: string } }`.
[^types]: `recipe?` is documented as the "Full escape hatch".
[^pkg]: L44 and L53.
[^commit-created]: Commit eccaaa67.
