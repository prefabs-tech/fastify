# 10 — `@prefabs.tech/fastify-phone-auth`

Passwordless phone login: a SuperTokens Passwordless recipe whose OTP is owned
by Twilio Verify rather than by SuperTokens.

Peers: `@prefabs.tech/fastify-config`, `-error-handler`, `-slonik`, `-user`,
`fastify`, `fastify-plugin`, `slonik`, `supertokens-node`. Bundles `twilio`.

Configuration-only. **It registers no routes of its own** — the passwordless
endpoints are served by the SuperTokens Fastify plugin that
`@prefabs.tech/fastify-user` registers.

## Registration

```typescript
import phoneAuthPlugin from "@prefabs.tech/fastify-phone-auth";
import userPlugin from "@prefabs.tech/fastify-user";

await fastify.register(phoneAuthPlugin);   // MUST come first
await fastify.register(userPlugin);
```

Registering it **after** the user plugin throws:

```
SuperTokens is already initialised. Register SuperTokens recipe plugins before @prefabs.tech/fastify-user.
```

The plugin calls `addSupertokensRecipe(fastify, initPasswordlessRecipe)`
synchronously at registration, then defers two things to `onReady`:

1. an idempotent `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20)`;
2. `fastify.graphql.extendSchema("extend type User { phoneNumber: String }")`.

Both have to wait, because the `users` table and the GraphQL `User` type are
created by the user plugin — which registers *after* this one. The schema
extension is guarded by `fastify.graphql?.schema?.getType("User")`, so an app
without GraphQL, or one that never merged `userSchema`, is skipped rather than
failed. No resolver is needed; the default field resolver reads the camelised
`phoneNumber` off the row.

Nothing runs when `config.phoneAuth.enabled === false` — no recipe, no
migration.

## Configuration

```typescript
config.phoneAuth = {
  bypassSmsFor: ["+15550000000"],
  contactMethod: "PHONE",
  devModeOtp: "123456",
  enabled: true,
  enableDevMode: config.env !== "production",
  fallbackEmailDomain: "example.com",
  flowType: "USER_INPUT_CODE",
  override: { apis: {}, functions: {} },
  twilio: { verifyServiceSid: "VA..." },
};
```

| Key | Default | Notes |
|---|---|---|
| `enabled` | on | `=== false` disables |
| `contactMethod` | `"PHONE"` | Also `"EMAIL"`, `"EMAIL_OR_PHONE"` |
| `flowType` | `"USER_INPUT_CODE"` | Typed to this value only — magic links are not supported |
| `twilio` | — | Twilio service config minus `from` / `messagingServiceSid`, plus a required `verifyServiceSid`. `accountSid` and `authToken` are required too |
| `enableDevMode` | `false` | Skips Twilio entirely; accepts `devModeOtp` for every number |
| `devModeOtp` | — | **Required** when `enableDevMode` is true |
| `bypassSmsFor` | — | Numbers that skip Twilio and use `devModeOtp`, even outside dev mode |
| `fallbackEmailDomain` | app name | Domain for the synthetic email |
| `override.apis` / `.functions` | — | `(originalImplementation, fastify)` wrappers, merged over the built-ins |
| `recipe` | — | Full escape hatch: `(fastify) => PasswordlessRecipeConfig`, replacing the generated config |

Validation runs inside `supertokens.init()`, so all three failures stop boot:

| Condition | Message |
|---|---|
| `config.phoneAuth` absent | `Phone auth config is missing. Add \`phoneAuth\` to your app config.` |
| `enableDevMode` without `devModeOtp` | `phoneAuth.devModeOtp is required when phoneAuth.enableDevMode is true` |
| `phoneAuth.twilio` absent (outside dev mode) | `Twilio config is missing for phone auth. Add \`phoneAuth.twilio\` to your app config.` |
| `verifyServiceSid` missing | `phoneAuth.twilio.verifyServiceSid is required for phone auth verification` |
| `accountSid` or `authToken` missing | `phoneAuth.twilio.accountSid and phoneAuth.twilio.authToken are required for phone auth verification` |

Outside dev mode the recipe builder calls `getTwilioClient` eagerly, precisely
so a credential problem fails at boot rather than on the first sign-in.

## How the OTP flow works

SuperTokens insists on storing a user input code of its own, but Twilio Verify
owns the real one. The package bridges the two with a placeholder.

**On create** (`createCodePOST`): `input.phoneNumber` is copied onto
`input.userContext` so later hooks can read it. `getCustomUserInputCode`
returns `TWILIO_VERIFY_PLACEHOLDER_CODE` (`"000000"`) for a normal number, or
`devModeOtp` in dev mode or for a number in `bypassSmsFor`. Outside dev mode,
`smsDelivery.override.sendSms` first skips any number in `bypassSmsFor`
(logging `Skipping SMS for test number ...`), and otherwise calls
`verify.v2.services(sid).verifications.create({ channel: "sms", to })`; send
failures are logged and rethrown. In dev mode no SMS is sent at all — the
recipe supplies a logging `createAndSendCustomTextMessage` instead.

The bypass is therefore checked in **two independent places**:
`getCustomUserInputCode` reads `userContext.phoneNumber`, while `sendSms` reads
the real `input.phoneNumber`. On the create path both see the number and agree;
on resend they do not — see the limitations below.

**On consume** (`consumeCodePOST`): the device is looked up by
`preAuthSessionId`, then
`verify.v2.services(sid).verificationChecks.create({ code, to })` runs. On
`approved` the original `consumeCodePOST` is replayed with the placeholder
code; otherwise `INCORRECT_USER_INPUT_CODE_ERROR` is returned with
`failedCodeInputAttemptCount: 1` and `maximumCodeInputAttempts: 5` — both
**hardcoded**, so they do not reflect the real attempt count and a client
cannot use them to drive a lockout. Dev mode and bypassed numbers go straight
to the original, which validates against `devModeOtp`. A request carrying no
`userInputCode` — a magic-link flow — passes through untouched.

A missing device or phone number, unusable Twilio credentials, or a thrown
Twilio call all degrade to `{ status: "RESTART_FLOW_ERROR" }` after logging.

## Local user creation

`functions.consumeCode` keeps the local `users` table in step:

1. Every role in `userContext.roles` (default `[config.user.role ?? ROLE_USER]`)
   must exist, or a `SIGNUP_FAILED_ERROR` `CustomError` is thrown.
2. When SuperTokens reports `createdNewUser`, a row is created through
   `getUserService` with the id, phone number, and a synthetic email
   `<phoneNumber>@<fallbackEmailDomain>`. The domain falls back to the app name
   lowercased with whitespace stripped, plus `.com`.
3. **If the local insert throws, the SuperTokens user is deleted** before the
   error is rethrown, so the two stores cannot drift.
4. Missing both phone number and email also deletes the SuperTokens user and
   throws.
5. Roles are assigned with `UserRoles.addRoleToUser`; a non-`OK` status is
   logged, not thrown.
6. For a returning user, `lastLoginAt` is refreshed; a failure there is logged
   and swallowed so sign-in still succeeds.

The user service is built from the request recovered via
`getRequestFromUserContext`, so `request.config`, `request.slonik`, and
`request.dbSchema` take precedence over the Fastify-level ones — which is what
makes multi-tenant schema routing work on this path.

## The `User` augmentation

`User` from `@prefabs.tech/fastify-user` gains `phoneNumber?: string`, which
flows into `UserCreateInput`. The user package's REST response schema does not
carry the field, so **it is not serialized on the users REST routes**. GraphQL
exposure is handled at runtime by the `onReady` schema extension.

## Known limitations

**`bypassSmsFor` is only half-applied on resend.** `resendCodePOST` is not
overridden, and `userContext.phoneNumber` is set only by `createCodePOST`, so
on the resend path `getCustomUserInputCode` cannot tell that the number is
bypassed and returns the **placeholder** instead of `devModeOtp`. `sendSms`
still recognises the number — it reads the real `input.phoneNumber` — and skips
the SMS. The net effect for a bypassed number that resends: no SMS arrives, and
the stored code is now `"000000"` rather than `devModeOtp`, so entering the dev
OTP fails. Restart the flow rather than resending.

**`fallbackEmailDomain` is not defaulted on the consume path.**
`consumeCode` falls back to the app name (lowercased, whitespace stripped, plus
`.com`) when the option is unset, but `consumeCodePOST`'s `enrichResult` uses
`phoneAuth.fallbackEmailDomain ?? ""`. With the option unset, the *response*
from a sign-in can therefore carry an email of the form `+15550000000@` with an
empty domain, even though the row written to the database has the proper
app-name fallback. Set `fallbackEmailDomain` explicitly to avoid the
inconsistency.

## Exports

| Export | Kind |
|---|---|
| `default` | the plugin |
| `initPasswordlessRecipe` | recipe factory |
| `getPasswordlessRecipeConfig` | the generated recipe config |
| `consumeCode`, `consumeCodePOST` | the overrides, for composing your own |
| `getTwilioClient` | Twilio client factory |
| `DEFAULT_CONTACT_METHOD`, `DEFAULT_FLOW_TYPE`, `ERROR_CODES`, `TWILIO_VERIFY_PLACEHOLDER_CODE` | constants |
| `PhoneAuthConfig`, `TwilioConfig`, `APIInterfaceWrapper`, `RecipeInterfaceWrapper` | types |
