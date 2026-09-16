# 06 — `@prefabs.tech/fastify-mailer`

A nodemailer transport with MJML templating, automatic plain-text generation,
and a switch that redirects every outgoing message to a fixed list — the piece
that makes non-production environments safe.

Peers: `@prefabs.tech/fastify-config`, `fastify`, `fastify-plugin`,
`mjml >= 4.18.0`.

`@prefabs.tech/fastify-user` depends on this package for invitation, password
reset, email verification, and duplicate-email messages.

## Registration

```typescript
import mailerPlugin from "@prefabs.tech/fastify-mailer";

await fastify.register(mailerPlugin, {
  defaults: {
    from: { address: "no-reply@example.com", name: "Example" },
    replyTo: "support@example.com",
  },
  recipients: config.env === "production" ? undefined : ["dev@example.com"],
  templateData: { appName: "Example", year: 2026 },
  templating: { templateFolder: "./templates" },
  test: { enabled: true, path: "/email/test", to: "dev@example.com" },
  transport: {
    auth: { pass: process.env.SMTP_PASSWORD, user: process.env.SMTP_USER },
    host: "smtp.example.com",
    port: 587,
  },
});
```

| Field | Type | Notes |
|---|---|---|
| `transport` | nodemailer `SMTPOptions` | Pass-through to `createTransport`; any SMTP provider |
| `defaults` | nodemailer `Options` + required `from: { address, name }` | Applied to every message |
| `templating` | `IPluginOptions` from `nodemailer-mjml` | `templateFolder` is the one you need |
| `templateData` | `Record<never, never>` | Merged into every render |
| `recipients` | `string[]` | Redirect switch — see below |
| `test` | `{ enabled, path, to }` | Registers a GET route that sends a test email |

Registering with no options falls back to `fastify.config.mailer` with a
deprecation warning, and throws `Missing mailer configuration. Did you forget
to pass it to the mailer plugin?` when that is absent.

Registering twice throws `fastify-mailer has already been registered`.

## What it adds

`fastify.mailer` — the nodemailer `Transporter`, with `sendMail` replaced by a
wrapper. Two compile-stage middlewares are installed on the transporter:
`nodemailer-mjml` (with `validationLevel: "soft"`) resolves and compiles `.mjml`
templates, then `nodemailer-html-to-text` derives a plain-text part from the
rendered HTML automatically.

## Sending

```typescript
await fastify.mailer.sendMail({
  subject: "Welcome",
  templateData: { firstName: "Ada" },
  templateName: "welcome",     // resolves templateFolder/welcome.mjml
  to: "ada@example.com",
});
```

A Node-style callback is accepted as the second argument; omitting it returns a
promise resolving to nodemailer's `SentMessageInfo`.

### Template data merge

Per-call `templateData` is shallow-merged **over** the configured
`templateData`; per-call keys win. The configured object is never mutated.

```typescript
// config: { appName: "Example", year: 2026 }
// call:   { year: 2027, firstName: "Ada" }
// render: { appName: "Example", year: 2027, firstName: "Ada" }
```

Only one level deep — a nested object in a per-call value replaces the
configured one wholesale rather than merging into it.

### Recipient redirect

When `recipients` is a non-empty array, **every** outgoing message goes to
those addresses regardless of its `to`, and `cc` and `bcc` are cleared to
`undefined`.

```typescript
recipients: config.env === "production" ? undefined : ["qa@example.com"],
```

This is the mechanism that keeps a staging environment from emailing real
users. It is applied inside `sendMail`, so it covers mail sent by
`@prefabs.tech/fastify-user` too — invitations included. An empty array does
**not** redirect; use `undefined` to disable.

## Test route

With `test.enabled`, a `GET` route is registered at `test.path` that compiles a
fixed MJML body inline — not through `templateFolder` — and sends it to
`test.to`.

```json
{
  "status": "ok",
  "message": "Email successfully sent",
  "info": { "from": "...", "to": "..." }
}
```

The route is tagged `["email"]` with summary `"Test email"`, so it appears in
the OpenAPI document. Its 200 and 500 responses are schema-validated. Leave
`test` out, or set `test.enabled: false`, in production.

## Exports

| Export | Kind |
|---|---|
| `default` | the plugin |
| `FastifyMailer`, `FastifyMailerNamedInstance`, `MailerConfig` | types |

`FastifyInstance` is augmented with `mailer: FastifyMailer`; `ApiConfig` with
`mailer: MailerConfig`.
