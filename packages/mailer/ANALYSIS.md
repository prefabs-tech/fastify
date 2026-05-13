<!-- Package analysis — produced by /analyze-package. Do not edit manually. -->

# @prefabs.tech/fastify-mailer — Analysis

## Base Library Passthrough Analysis

### nodemailer — PARTIAL PASSTHROUGH

- Options type: custom `MailerConfig` with `transport: SMTPOptions` and `defaults: { from } & Partial<Options>`
- Options passed: transformed before send
  - `createTransport(transport, defaults)` is direct passthrough at registration time.
  - Outgoing `sendMail` input is wrapped to merge template data and optionally override recipients.
- Features restricted: none at transport level; delivery payload is modified when `recipients` is configured.
- Features added:
  - Fastify decorator (`fastify.mailer`)
  - Global + per-email `templateData` merge
  - Optional recipient redirection (`to` override, `cc`/`bcc` cleared)
  - Optional callback-aware wrapper

### nodemailer-mjml — PARTIAL PASSTHROUGH

- Options type: `templating: IPluginOptions` in our config type
- Options passed: transformed — only `{ templateFolder: templating.templateFolder }` is forwarded to `nodemailerMjmlPlugin`
- Features restricted: other `IPluginOptions` keys are not forwarded
- Features added: integrated compile hook registration inside plugin startup

### nodemailer-html-to-text — MODIFIED

- Options type: none exposed
- Options passed: transformed — always called as `htmlToText()` with default options
- Features restricted: no way to configure plugin options from `MailerConfig`
- Features added: automatic compile hook registration after MJML compile hook

### mjml — MODIFIED

- Options type: none exposed
- Options passed: transformed — `mjml2html()` is used only in the optional test route with an inline MJML template string
- Features restricted: not configurable through plugin options
- Features added: built-in HTTP test endpoint that sends a compiled test email

### fastify-plugin — FULL PASSTHROUGH

- Options type: not applicable
- Options passed: unmodified plugin wrapper (`FastifyPlugin(plugin)`)
- Features restricted: none
- Features added: encapsulation bypass for decorated `fastify.mailer`

## Function/Export Classification (Ours vs Theirs)

- `default export from src/plugin.ts` (`FastifyPlugin(plugin)`) — **OURS**
  - Our registration logic, decorators, wrappers, and conditionals are inside `plugin`.
  - Wrapper call to `fastify-plugin` is third-party integration.
- `default export from src/index.ts` (re-export plugin) — **OURS**
  - Public package entrypoint and module augmentation.
- `FastifyMailer` (type alias) — **OURS** (extends third-party `Transporter`)
- `FastifyMailerNamedInstance` (interface) — **OURS**
- `MailerConfig` / `MailerOptions` (config shape) — **OURS** (composes third-party option types)
- `router` (`src/router.ts`) — **OURS**
  - Registers conditional test endpoint and response payload contract.
- `testEmailSchema` (`src/schema.ts`) — **OURS**
  - Defines schema for test route responses and OpenAPI metadata.

## Fastify Integrations

### Decorators Added

- `fastify.mailer` — decorated once after transport setup
- Guard: throws `"fastify-mailer has already been registered"` if already present

### Hooks/Routes Registered

- Nodemailer `"compile"` hook with `nodemailerMjmlPlugin({ templateFolder })`
- Nodemailer `"compile"` hook with `htmlToText()`
- Conditional Fastify `GET` route at `test.path` (when `test?.enabled`)

## Conditional Branches

- **Legacy config fallback**
  - Condition: `Object.keys(options).length === 0`
  - Behavior: warn + read `fastify.config.mailer`
  - Error path: throws if `fastify.config.mailer` missing
- **Template data merge**
  - Starts with empty object
  - Merges global config `templateData` if present
  - Merges per-email `userOptions.templateData` last (wins on key conflicts)
- **Recipient override**
  - Condition: `recipients && recipients.length > 0`
  - Behavior: force `to = recipients`, set `cc` and `bcc` to `undefined`
- **Callback path**
  - Condition: callback provided to `sendMail`
  - Behavior: calls `transporter.sendMail(mailerOptions, callback)`; otherwise promise path
- **Test route registration**
  - Condition: `test && test.enabled`
  - Behavior: register internal router with `{ path, to }`

## Default Values and Implicit Defaults

- `templateData` defaults to `{}` inside wrapped `sendMail`
- `cc` and `bcc` are explicitly set to `undefined` only in recipient-override mode
- Test route is disabled by default (when `test` is missing or `enabled` is false)
- `htmlToText()` runs with library defaults (no options passed)

## Notes from Existing Docs and Tests

- Existing `FEATURES.md` and `GUIDE.md` largely match implementation.
- One important nuance from source: `templating` is typed as `IPluginOptions`, but only `templateFolder` is currently forwarded.
- Tests verify registration flow, template-data merge precedence, recipient override behavior, and conditional test route behavior.

## Completeness Checklist

- [x] Classified every public export as "ours" or "theirs"
- [x] Listed every Fastify decorator added
- [x] Listed every hook registered
- [x] Identified every conditional branch
- [x] Documented default values for options we define
- [x] Produced passthrough classification for every wrapped dependency
