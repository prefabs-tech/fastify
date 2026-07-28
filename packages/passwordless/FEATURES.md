<!-- Structured feature inventory — used by automated test generation. Developer docs: see GUIDE.md -->

# @prefabs.tech/fastify-passwordless — Features

## Plugin Lifecycle

1. **Enable/disable via config flag** — when `config.passwordless.enabled === false`, no recipe factory is contributed and the SuperTokens passwordless endpoints are not served. The check is `=== false`; `undefined` means enabled.

2. **Automatic recipe registration** — on registration (when enabled), the plugin pushes `initPasswordlessRecipe` into the SuperTokens recipe registry via `addSupertokensRecipe` from `@prefabs.tech/fastify-user`. No consumer wiring beyond registering the plugin is required.

3. **Registration order guard** — `addSupertokensRecipe` throws when the Fastify instance already carries the `supertokensInitialized` decorator, i.e. when this plugin is registered *after* `@prefabs.tech/fastify-user`. SuperTokens allows exactly one global `init()`, so a late registration could not contribute a recipe; failing loudly beats silently dropping passwordless login.

4. **No routes of its own** — this package registers no controllers. The passwordless endpoints are served by the SuperTokens Fastify plugin that `@prefabs.tech/fastify-user` registers.

## Recipe Configuration

5. **Default contact method and flow type** — `contactMethod` defaults to `"PHONE"` and `flowType` to `"USER_INPUT_CODE"`, both overridable through `config.passwordless`. `flowType` is typed to `"USER_INPUT_CODE"` only; magic-link flows are not supported.

6. **Full recipe escape hatch** — when `config.passwordless.recipe` is a function, it is called with the Fastify instance and its return value is passed straight to `Passwordless.init`, bypassing the generated config entirely.

7. **Boot-time config validation** — `getPasswordlessRecipeConfig` throws when `config.passwordless` is absent, when `enableDevMode` is true without a `devModeOtp`, and (outside dev mode) when the Twilio credentials are missing or incomplete. All three run inside `supertokens.init()`, so they fail at boot.

8. **API override wrappers** — each entry in `config.passwordless.override.apis` is invoked with `(originalImplementation, fastify)` and spread over the built-in API overrides, so a consumer wrapper wins.

9. **Function override wrappers** — same mechanism for `config.passwordless.override.functions` over the built-in `consumeCode` override.

## Twilio Verify Integration

10. **Placeholder user input code** — `getCustomUserInputCode` returns `TWILIO_VERIFY_PLACEHOLDER_CODE` (`"000000"`) for regular numbers, so SuperTokens stores a code while Twilio Verify owns the real OTP.

11. **Dev mode OTP** — when `config.passwordless.enableDevMode` is true, `getCustomUserInputCode` returns `devModeOtp` for every number.

12. **Per-number SMS bypass** — outside dev mode, numbers listed in `config.passwordless.bypassSmsFor` also get `devModeOtp` and no SMS is sent.

13. **SMS delivery through Twilio Verify** — outside dev mode, `smsDelivery.override.sendSms` calls `verify.v2.services(verifyServiceSid).verifications.create({ channel: "sms", to })`. Send failures are logged and rethrown.

14. **Dev mode skips SMS delivery entirely** — in dev mode the recipe supplies `createAndSendCustomTextMessage` (a log line) instead of `smsDelivery`.

15. **Phone number capture on create** — the `createCodePOST` override copies `input.phoneNumber` onto `input.userContext` so downstream hooks can read it.

16. **OTP verification on consume** — the `consumeCodePOST` override looks the device up by `preAuthSessionId`, then calls `verify.v2.services(verifyServiceSid).verificationChecks.create({ code, to })`. On `approved` it replays the original `consumeCodePOST` with the placeholder code; otherwise it returns `INCORRECT_USER_INPUT_CODE_ERROR`.

17. **Graceful degradation to RESTART_FLOW_ERROR** — a missing device/phone number, unusable Twilio credentials, or a thrown Twilio Verify call all return `{ status: "RESTART_FLOW_ERROR" }` after logging.

18. **Dev mode and bypassed numbers skip Twilio on consume** — they go straight to the original `consumeCodePOST`, which validates against `devModeOtp`.

19. **Magic link flows pass through untouched** — when `input` carries no `userInputCode`, `consumeCodePOST` delegates to the original implementation without contacting Twilio.

20. **Synthetic email enrichment** — successful consume responses get `email` filled in as `<phoneNumber>@<fallbackEmailDomain>` when SuperTokens has none.

## Local User Creation

21. **Role existence check before signup** — `functions.consumeCode` verifies every role in `userContext.roles` (default `[config.user.role ?? ROLE_USER]`) exists, throwing a `SIGNUP_FAILED_ERROR` `CustomError` otherwise.

22. **Local user row on first sign-in** — when SuperTokens reports `createdNewUser`, a row is created through `getUserService` with the id, phone number, and synthetic email. The email domain falls back to the app name lowercased with whitespace stripped plus `.com`.

23. **Rollback on failed insert** — if the local insert throws, the SuperTokens user is deleted via `deleteUser` before the error is rethrown, so the two stores cannot drift.

24. **Missing phone number aborts signup** — when neither a phone number nor an email is available the SuperTokens user is deleted and an error is thrown.

25. **Role assignment** — each role is assigned with `UserRoles.addRoleToUser`; a non-`OK` status is logged rather than thrown.

26. **`lastLoginAt` refresh on returning users** — when no new user was created, `lastLoginAt` is updated; a failure is logged and swallowed so sign-in still succeeds.

27. **Multi-tenant request context** — the user service is built from the request recovered via `getRequestFromUserContext`, so `request.config`, `request.slonik` and `request.dbSchema` win over the Fastify-level ones when present.

## Known Limitations

28. **`bypassSmsFor` does not apply on resend** — `resendCodePOST` is not overridden and `userContext.phoneNumber` is only set by `createCodePOST`, so `getCustomUserInputCode` cannot match a bypassed number on the resend path.
