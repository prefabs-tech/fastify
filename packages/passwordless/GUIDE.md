# @prefabs.tech/fastify-passwordless — Developer Guide

## Installation

### For package consumers

```bash
npm install @prefabs.tech/fastify-passwordless
```

```bash
pnpm add @prefabs.tech/fastify-passwordless
```

Peer dependencies are listed in [README.md](./README.md#requirements).

### For monorepo development

```bash
pnpm install
pnpm --filter @prefabs.tech/fastify-passwordless test
pnpm --filter @prefabs.tech/fastify-passwordless build
```

## Registration order — read this first

SuperTokens permits exactly one global `supertokens.init()`. `@prefabs.tech/fastify-user` performs it synchronously while it is being registered, building its recipe list at that moment. Recipe plugins therefore contribute their recipe through a registry that `@prefabs.tech/fastify-user` drains at init time, which means **this plugin must be registered before it**.

```typescript
await fastify.register(configPlugin, { config });
await fastify.register(slonikPlugin);
await fastify.register(passwordlessPlugin); // pushes the recipe factory
await fastify.register(userPlugin); // supertokens.init() drains the registry
```

Get the order wrong and registration fails loudly rather than silently dropping passwordless login:

```
Error: SuperTokens is already initialised. Register SuperTokens recipe plugins
before @prefabs.tech/fastify-user.
```

The registry itself is `addSupertokensRecipe`, exported from `@prefabs.tech/fastify-user`. It is generic — any package can use it to contribute a SuperTokens recipe.

## Setup

```typescript
import type { ApiConfig } from "@prefabs.tech/fastify-config";

import configPlugin from "@prefabs.tech/fastify-config";
import passwordlessPlugin from "@prefabs.tech/fastify-passwordless";
import slonikPlugin from "@prefabs.tech/fastify-slonik";
import userPlugin from "@prefabs.tech/fastify-user";
import Fastify from "fastify";

const config: ApiConfig = {
  // ...the rest of your app config
  passwordless: {
    fallbackEmailDomain: "example.com",
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID as string,
      authToken: process.env.TWILIO_AUTH_TOKEN as string,
      verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID as string,
    },
  },
};

const fastify = Fastify();

await fastify.register(configPlugin, { config });
await fastify.register(slonikPlugin);
await fastify.register(passwordlessPlugin);
await fastify.register(userPlugin);
```

All subsequent examples assume this setup.

---

## Base Libraries

### `supertokens-node` — Passwordless recipe (MODIFIED passthrough)

This plugin does not expose routes of its own. It configures SuperTokens' Passwordless recipe, and the SuperTokens Fastify plugin registered by `@prefabs.tech/fastify-user` serves the resulting endpoints (`POST <apiBasePath>/signinup/code`, `POST <apiBasePath>/signinup/code/consume`, `POST <apiBasePath>/signinup/code/resend`). See the [SuperTokens Passwordless docs](https://supertokens.com/docs/passwordless/introduction) for the endpoint contracts.

Our delta over the stock recipe:

- `contactMethod` is constrained to `"EMAIL" | "EMAIL_OR_PHONE" | "PHONE"` and defaults to `"PHONE"`.
- `flowType` is constrained to `"USER_INPUT_CODE"` — magic-link and link-or-code flows are deliberately not supported.
- `getCustomUserInputCode` returns a placeholder rather than a real OTP (see below).
- `apis.consumeCodePOST`, `apis.createCodePOST` and `functions.consumeCode` are overridden. `resendCodePOST` and `functions.createCode` are not.
- `smsDelivery.sendSms` is replaced with a Twilio Verify call, or with a log line in dev mode.

### `twilio` — Verify API (PARTIAL passthrough)

Only the Verify v2 service is used: `verifications.create` to send an OTP and `verificationChecks.create` to check one. Messaging/SMS APIs are not used, which is why `TwilioConfig` omits `from` and `messagingServiceSid` and requires `verifyServiceSid` instead.

---

## How the Twilio Verify bridge works

SuperTokens insists on owning a user input code; Twilio Verify insists on owning the OTP. The two are reconciled like this:

1. Sign in/up hits `createCodePOST`. The override records the phone number on `userContext`, then the SMS-delivery override asks Twilio Verify to send an OTP.
2. SuperTokens still stores a code of its own, so `getCustomUserInputCode` hands it the constant `TWILIO_VERIFY_PLACEHOLDER_CODE` (`"000000"`) instead of the real OTP.
3. The user submits the OTP they received. `consumeCodePOST` looks the device up by `preAuthSessionId` to recover the phone number, then checks the submitted code against Twilio Verify. If Twilio approves, the original `consumeCodePOST` is replayed with the placeholder so SuperTokens can complete its own flow.
4. `functions.consumeCode` then creates the matching row in your `users` table.

## User creation

On first successful sign-in, `functions.consumeCode`:

- Verifies every role in `userContext.roles` (default `[config.user.role ?? "USER"]`) exists, throwing a `SIGNUP_FAILED_ERROR` `CustomError` otherwise.
- Creates the local user with the phone number and a synthetic email of `<phoneNumber>@<fallbackEmailDomain>`, falling back to `<appName lowercased, spaces stripped>.com` when `fallbackEmailDomain` is unset. SuperTokens requires an email; passwordless phone users do not supply one.
- Assigns the roles via `UserRoles.addRoleToUser`.
- Deletes the SuperTokens user again if the local insert fails, so the two stores cannot drift.

On subsequent sign-ins it only updates `lastLoginAt`.

## Migration

This package owns the `phone_number` column. On `onReady` it runs an idempotent

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR ( 20 );
```

against `config.user.tables?.users?.name` (default `users`). It runs on `onReady`, not at registration time, because the table is created while `@prefabs.tech/fastify-user` registers — and this plugin has to be registered *before* that one.

It also augments the `User` interface from `@prefabs.tech/fastify-user` with `phoneNumber?: string`, so the field is typed wherever `User`, `UserCreateInput`, or `request.user` is used in an app that registers this plugin.

## GraphQL

`@prefabs.tech/fastify-user` does not carry `phoneNumber` in its `User` SDL, so this plugin adds it at runtime. In the same `onReady` hook as the migration it calls:

```typescript
fastify.graphql.extendSchema(`
  extend type User {
    phoneNumber: String
  }
`);
```

No consumer wiring is required — merge `userSchema` as you normally would and the field appears on the `User` type.

Details:

- **No resolver is needed.** The default field resolver reads `phoneNumber` off the row, which the slonik interceptor camelizes from `phone_number`; the user service selects `users.*`, so the value is already there.
- **It is skipped, not failed, when there is nothing to extend.** The hook checks `fastify.graphql?.schema?.getType("User")` first, so an app with `config.graphql.enabled = false` — or one that never merged `userSchema` — boots normally. Without that guard `extendSchema` throws `Cannot extend type "User" because it is not defined.`
- **Registration order does not matter.** The call happens on `onReady`, by which point mercurius has been registered regardless of whether this plugin was registered before or after `@prefabs.tech/fastify-graphql`.
- The REST response schema is separate and unaffected — `phoneNumber` is not serialized on the users REST routes.

## Configuration reference

`config.passwordless`:

| Key | Type | Default | Notes |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | Only `false` disables; `undefined` means enabled. |
| `contactMethod` | `"EMAIL" \| "EMAIL_OR_PHONE" \| "PHONE"` | `"PHONE"` | |
| `flowType` | `"USER_INPUT_CODE"` | `"USER_INPUT_CODE"` | |
| `fallbackEmailDomain` | `string` | app name + `.com` | Domain of the synthetic email. |
| `enableDevMode` | `boolean` | `false` | Skips Twilio for every number. |
| `devModeOtp` | `string` | — | Required when `enableDevMode` is `true`. |
| `bypassSmsFor` | `string[]` | `[]` | Phone numbers that skip Twilio and accept `devModeOtp`. |
| `twilio` | `TwilioConfig` | — | Required unless `enableDevMode` is `true`. |
| `override` | `{ apis?, functions? }` | — | Per-API/per-function wrappers, applied after the built-in overrides. |
| `recipe` | `(fastify) => TypeInput` | — | Full escape hatch: replaces the generated recipe config entirely. |

`TwilioConfig` is SuperTokens' `TwilioServiceConfig` without `from` and `messagingServiceSid`, plus a required `verifyServiceSid`.

### Disabling the plugin

```typescript
passwordless: {
  enabled: false;
}
```

No recipe is contributed and the SuperTokens passwordless endpoints are not served.

### Development without Twilio

```typescript
passwordless: {
  devModeOtp: "123456",
  enableDevMode: true,
  fallbackEmailDomain: "example.com",
}
```

Every number accepts `123456` and no SMS is sent. To keep Twilio live for real users but bypass it for a handful of test numbers, leave `enableDevMode` off and use `bypassSmsFor` together with `devModeOtp`.

## Overriding behaviour

Wrappers receive the original implementation and the Fastify instance, and are applied **after** the built-in overrides — so replacing `consumeCodePOST` or `consumeCode` removes the Twilio Verify integration or the local user creation respectively.

```typescript
passwordless: {
  override: {
    apis: {
      consumeCodePOST: (originalImplementation, fastify) => async (input) => {
        fastify.log.info("consuming a passwordless code");

        return originalImplementation.consumeCodePOST!(input);
      },
    },
  },
}
```

For total control, bypass the generated config entirely:

```typescript
passwordless: {
  recipe: (fastify) => ({
    contactMethod: "PHONE",
    flowType: "USER_INPUT_CODE",
  }),
}
```

## Validation and failure modes

`getPasswordlessRecipeConfig` runs during `supertokens.init()`, so configuration mistakes fail at boot rather than on the first sign-in attempt:

- No `config.passwordless` at all → `Passwordless recipe config is missing.`
- `enableDevMode: true` without `devModeOtp` → `passwordless.devModeOtp is required when passwordless.enableDevMode is true`
- Not in dev mode and `twilio` missing or incomplete → `Twilio config is missing for the passwordless recipe.` / `accountSid and ... authToken are required`

At request time, a Twilio Verify failure is logged and returned as `RESTART_FLOW_ERROR`; a rejected code returns `INCORRECT_USER_INPUT_CODE_ERROR`.

## Known limitation

`userContext.phoneNumber` is only set by the `createCodePOST` override, so it is unset on the **resend** path (`resendCodePOST` is not overridden). The `bypassSmsFor` check inside `getCustomUserInputCode` therefore cannot match on a resend.
