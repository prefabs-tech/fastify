---
type: Security
title: Secrets and Credentials
description: Where secrets enter an app built on these packages (never through environment variables read by the packages, always through config or options objects), which config fields carry them, which CI secrets the release workflows use, and where secret-bearing data can reach logs or responses.
tags: [security, secrets, credentials, config, ci]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: vite-env
    resource: repo://packages/slonik/vite.config.ts
    title: loadEnv merged into process.env at build time
  - id: slonik-options
    resource: repo://packages/slonik/src/types/config.ts#L5-L19
    title: SlonikOptions (db, clientConfiguration)
  - id: migrate
    resource: repo://packages/slonik/src/migrate.ts#L11-L25
    title: Migration client uses db password and ssl
  - id: st-types
    resource: repo://packages/user/src/supertokens/types/index.ts#L20-L57
    title: SupertokensConfig and providers
  - id: st-init
    resource: repo://packages/user/src/supertokens/init.ts#L10-L22
    title: supertokens.init core connection
  - id: firebase-config
    resource: repo://packages/firebase/src/index.ts#L28-L37
    title: firebase.credentials
  - id: firebase-init
    resource: repo://packages/firebase/src/lib/initializeFirebase.ts#L16-L30
    title: privateKey normalization
  - id: s3-types
    resource: repo://packages/s3/src/types/index.ts#L48-L56
    title: S3Config.clientConfig
  - id: mailer-types
    resource: repo://packages/mailer/src/types.ts#L12-L31
    title: MailerConfig.transport
  - id: phone-types
    resource: repo://packages/phone-auth/src/types.ts#L16-L71
    title: PhoneAuthConfig (twilio, devModeOtp)
  - id: phone-dev-log
    resource: repo://packages/phone-auth/src/recipe/config.ts#L138-L145
    title: Dev OTP logged at info
  - id: error-handler
    resource: repo://packages/error-handler/src/errorHandler.ts#L61-L131
    title: Errors logged in full; responses masked
  - id: client-config
    resource: repo://packages/slonik/src/factories/createClientConfig.ts#L30-L38
    title: Optional query logging interceptor
  - id: presign-user
    resource: repo://packages/user/src/model/users/service.ts#L209-L222
    title: User photo presigned URL lifetime
  - id: presign-default
    resource: repo://packages/s3/src/utils/s3Client.ts#L67-L81
    title: Default presigned URL lifetime
  - id: gitignore
    resource: repo://.gitignore
    title: .env files ignored
  - id: env-example
    resource: repo://.env.example
    title: .env.example
  - id: trigger
    resource: repo://.github/workflows/shipjs-trigger.yml#L30-L34
    title: Publish workflow secrets
  - id: manual-prepare
    resource: repo://.github/workflows/shipjs-manual-prepare.yml#L26-L29
    title: Prepare workflow secrets
---

# Secrets and Credentials

**No values appear on this page, and none should ever be added.**

## How secrets reach the packages
- **No package reads environment variables at runtime.** A search of `packages/*/src` for `process.env` finds nothing outside tests (checked 2026-09-11).
- Every credential arrives inside the config object passed to the config plugin, or the options passed to `register()`. Reading env vars, a secret manager or files is the **consuming app's** job.
- The only `process.env` handling is in each package's `vite.config.ts`, which merges `loadEnv(mode)` into `process.env` **at build time**.[^vite-env]

## Secret-bearing configuration fields
| Package | Field(s) | Consumed by |
|---------|----------|-------------|
| slonik | `db.password` (and `username`, `host`); `clientConfiguration.ssl` | the pool, and the separate migration `pg.Client`[^slonik-options][^migrate] |
| user | `supertokens.connectionUri` | `supertokens.init` (the only core connection setting passed)[^st-init] |
| user | `supertokens.providers.{google,github,facebook,apple,custom}`: OAuth client credentials in SuperTokens provider format | the thirdpartyemailpassword recipe[^st-types] |
| firebase | `credentials.{clientEmail,privateKey,projectId}` | `firebase-admin` `credential.cert`[^firebase-config] |
| s3 | `clientConfig` (AWS SDK `S3ClientConfig`, including credentials) | `new S3Client(clientConfig)`[^s3-types] |
| mailer | `transport` (nodemailer SMTP options, including auth) | `createTransport`[^mailer-types] |
| phone-auth | `twilio.{accountSid,authToken,verifyServiceSid}`; `devModeOtp` | Twilio client; dev-mode code[^phone-types] |

**Firebase private key.** Literal `\n` sequences in `privateKey` are converted to newlines before use, so the key can be stored as a single-line environment variable.[^firebase-init]

## Where secret-bearing data can surface
- **Logs**:
  - The error-handler logs the full error object for every handled error.[^error-handler]
  - The optional slonik query-logging interceptor logs executed queries when `queryLogging.enabled`.[^client-config]
  - phone-auth dev mode logs the dev OTP at info level whenever it skips sending a code.[^phone-dev-log]
- **Responses**: unhandled errors are masked unless `stackTrace: true`, which returns messages and stack frames.[^error-handler]
- **Presigned URLs** are bearer credentials for an object. User photo URLs are issued for **7 days** on every user read.[^presign-user] `FileService.presignedUrl` defaults to 1 hour.[^presign-default]

## Repository hygiene
- `.gitignore` ignores `**/.env*` except `.env.example`.[^gitignore]
- `.env.example` lists only `GITHUB_TOKEN`, with a placeholder, for local Ship.js use.[^env-example]

## CI secrets (names)
| Secret | Workflow |
|--------|----------|
| `GITHUB_TOKEN` | `shipjs-manual-prepare.yml`, `shipjs-trigger.yml` |
| `NPM_AUTH_TOKEN` | `shipjs-trigger.yml` (npm publish)[^trigger] |
| `SLACK_INCOMING_HOOK` | both Ship.js workflows[^manual-prepare] |

The test workflow uses no secrets.

[^vite-env]: `process.env = { ...process.env, ...loadEnv(mode, process.cwd()) }`.
[^slonik-options]: `db: ConnectionOptions`; `clientConfiguration?: ClientConfigurationInput`.
[^migrate]: `password: slonikOptions.db.password`; ssl copied from `clientConfiguration.ssl`.
[^st-init]: `supertokens: { connectionURI: ... }`.
[^st-types]: `SupertokensThirdPartyProvider` L51-57.
[^firebase-config]: Augmented `ApiConfig.firebase.credentials`.
[^firebase-init]: `privateKey.replaceAll(String.raw`\n`, "\n")`.
[^s3-types]: `clientConfig: S3ClientConfig`.
[^mailer-types]: `transport: SMTPOptions`.
[^phone-types]: `TwilioConfig` L66-71; `devModeOtp` L29.
[^phone-dev-log]: "Use default OTP [${developmentModeOtp}] for testing."
[^error-handler]: `logger.error(error)` / `logger.info(error)`; masking L110-131.
[^client-config]: `createQueryLoggingInterceptor()` when enabled.
[^presign-user]: `signedUrlExpiresInSecond: 604_800`.
[^presign-default]: `signedUrlExpiresInSecond = 3600`.
[^gitignore]: `**/.env*` and `!**/.env.example`.
[^env-example]: A single `GITHUB_TOKEN` line.
[^trigger]: `env` block on the `npx shipjs trigger` step.
[^manual-prepare]: `env` block on the `npm run release` step.
