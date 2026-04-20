# @prefabs.tech/fastify-mailer — Developer Guide

## Installation

### For package consumers (npm + pnpm)

```bash
# npm
npm install @prefabs.tech/fastify-mailer nodemailer mjml fastify fastify-plugin

# pnpm
pnpm add @prefabs.tech/fastify-mailer nodemailer mjml fastify fastify-plugin
```

Peer dependencies that must be installed alongside the package:

| Peer dependency                | Required version                                         |
| ------------------------------ | -------------------------------------------------------- |
| `fastify`                      | `>=5.2.1`                                                |
| `fastify-plugin`               | `>=5.0.1`                                                |
| `mjml`                         | `>=4.15.3`                                               |
| `@prefabs.tech/fastify-config` | `0.93.5` (optional — only needed for legacy config mode) |

### For monorepo development (pnpm install / test / build)

```bash
# From repo root — installs all workspace dependencies
pnpm install

# Run tests for this package only
pnpm --filter @prefabs.tech/fastify-mailer test

# Build
pnpm --filter @prefabs.tech/fastify-mailer build

# Type-check
pnpm --filter @prefabs.tech/fastify-mailer typecheck
```

## Setup

Complete working example. All later examples in this guide assume this setup is in place.

```typescript
import Fastify from "fastify";
import mailerPlugin from "@prefabs.tech/fastify-mailer";
// Importing the package automatically augments FastifyInstance and ApiConfig types.
import "@prefabs.tech/fastify-mailer";

const fastify = Fastify({ logger: true });

await fastify.register(mailerPlugin, {
  transport: {
    host: "smtp.example.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  },
  defaults: {
    from: {
      address: "noreply@myapp.com",
      name: "My App",
    },
  },
  templating: {
    templateFolder: "./src/email-templates",
  },
  // Optional: global template variables injected into every email
  templateData: {
    appName: "My App",
    supportEmail: "support@myapp.com",
  },
  // Optional: redirect all emails during development/staging
  // recipients: ["dev@myapp.com"],

  // Optional: enable a test route at startup to verify mail delivery
  // test: { enabled: true, path: "/test/email", to: "dev@myapp.com" },
});

await fastify.ready();
```

---

## Base Libraries

### nodemailer — Partial Passthrough

Their docs: https://www.npmjs.com/package/nodemailer

`nodemailer.createTransport()` is called internally with the `transport` and `defaults` options you provide. `fastify.mailer` is built from that transporter, but `sendMail` is wrapped by this package before delivery.

What we add on top:

- We wrap `sendMail` to inject template data (global + per-email merge) before forwarding to the underlying transporter.
- When `recipients` is configured, we intercept the `to`, `cc`, and `bcc` fields before the call reaches nodemailer.
- `createTransport` and the raw `Transporter` are never directly exposed — access is always through `fastify.mailer`.

### nodemailer-mjml — Partial Passthrough

Their docs: https://www.npmjs.com/package/nodemailer-mjml

The plugin is registered on nodemailer's `"compile"` lifecycle hook with the `templateFolder` you provide. We currently forward only `templateFolder` to `nodemailerMjmlPlugin`, even though `templating` is typed as `IPluginOptions`.

### nodemailer-html-to-text — Modified

Their docs: https://www.npmjs.com/package/nodemailer-html-to-text

Registered on nodemailer's `"compile"` lifecycle hook after MJML (so it operates on already-compiled HTML). We always call `htmlToText()` with no options and do not expose configuration.

### mjml — Modified

Their docs: https://www.npmjs.com/package/mjml

Used only inside the built-in test route to compile a hardcoded MJML snippet inline via `mjml2html()`. Application code that uses template files through nodemailer-mjml does not interact with this dependency directly.

### fastify-plugin — Full Passthrough

Their docs: https://www.npmjs.com/package/fastify-plugin

The entire plugin is wrapped with `FastifyPlugin()` to opt out of Fastify's encapsulation scope. This means the `fastify.mailer` decorator is available in all child plugins and routes without re-registering.

---

## Features

### 1. Plugin registration info log

When the plugin initialises it writes an `info`-level log entry:

```
Registering fastify-mailer plugin
```

No configuration required.

### 2. Duplicate registration guard

Registering the plugin twice on the same Fastify instance throws synchronously:

```typescript
await fastify.register(mailerPlugin, options); // OK
await fastify.register(mailerPlugin, options); // throws "fastify-mailer has already been registered"
```

### 3. Config fallback (legacy mode)

If you call `register()` with no options, the plugin looks for `fastify.config.mailer`. This requires the `@prefabs.tech/fastify-config` package to be registered first and is deprecated in favour of passing options directly.

```typescript
import configPlugin from "@prefabs.tech/fastify-config";
import mailerPlugin from "@prefabs.tech/fastify-mailer";

// fastify-config populates fastify.config.mailer from environment / config file
await fastify.register(configPlugin);

// mailerPlugin reads fastify.config.mailer automatically
await fastify.register(mailerPlugin);
```

When this path is taken the plugin logs a warning:

```
The mailer plugin now recommends passing mailer options directly to the plugin.
```

### 4. Missing config error

When neither inline options nor `fastify.config.mailer` are present:

```typescript
await fastify.register(mailerPlugin);
// Error: Missing mailer configuration. Did you forget to pass it to the mailer plugin?
```

### 5. Fastify encapsulation bypass

Because the plugin is wrapped with `fastify-plugin`, the `fastify.mailer` decorator is visible to the entire server — including sibling plugins and parent scopes — without additional registration.

```typescript
await fastify.register(mailerPlugin, options);

fastify.register(async (childPlugin) => {
  // fastify.mailer is accessible here without re-registering
  await childPlugin.mailer.sendMail({
    to: "user@example.com",
    subject: "Hi",
    html: "<p>Hello</p>",
  });
});
```

### 6. SMTP transport creation

The `transport` option is passed verbatim to `nodemailer.createTransport()` alongside `defaults`. Any SMTP provider supported by nodemailer works.

```typescript
await fastify.register(mailerPlugin, {
  transport: {
    host: "email-smtp.us-east-1.amazonaws.com",
    port: 465,
    secure: true,
    auth: { user: process.env.SES_USER, pass: process.env.SES_PASS },
  },
  defaults: { from: { address: "no-reply@myapp.com", name: "My App" } },
  templating: { templateFolder: "./templates" },
});
```

### 7. Default sender via `defaults.from`

`defaults.from` must contain an `address` and a `name`. These are used as the `From` header on every outgoing email. Any additional nodemailer `Options` (such as `replyTo`) can also live under `defaults`.

```typescript
await fastify.register(mailerPlugin, {
  // ...
  defaults: {
    from: {
      address: "noreply@myapp.com",
      name: "My App",
    },
    replyTo: "support@myapp.com",
  },
  // ...
});
```

### 8. MJML compile hook

On plugin startup, `nodemailerMjmlPlugin({ templateFolder })` is registered on nodemailer's `"compile"` lifecycle. Name your templates `<name>.mjml` inside `templateFolder`. Reference them by name in `sendMail` calls via the `templateName` field (a nodemailer-mjml convention).

```typescript
// Template at: ./src/email-templates/welcome.mjml
await fastify.mailer.sendMail({
  to: "user@example.com",
  subject: "Welcome",
  templateName: "welcome", // nodemailer-mjml resolves this to the .mjml file
  templateData: { firstName: "Ada" }, // variables injected into the template
});
```

See the [nodemailer-mjml docs](https://www.npmjs.com/package/nodemailer-mjml) for the full template syntax.

### 9. Auto HTML-to-text conversion

A plain-text `text` part is automatically generated from the `html` content of every email. No configuration is required and nothing needs to be set in `sendMail` calls. The conversion runs after MJML compilation.

### 10. Transporter-backed `fastify.mailer` decorator

`fastify.mailer` is created from the nodemailer transporter and adds a wrapped `sendMail` implementation that injects plugin behavior (templateData merge + optional recipient override):

```typescript
await fastify.mailer.sendMail({
  to: "user@example.com",
  subject: "Hello",
  html: "<p>Hello</p>",
});
```

### 11. Promise-based `sendMail`

```typescript
const info = await fastify.mailer.sendMail({
  to: "user@example.com",
  subject: "Order confirmation",
  html: "<p>Your order has shipped.</p>",
});
console.log("Message ID:", info.messageId);
```

### 12. Callback-based `sendMail`

```typescript
fastify.mailer.sendMail(
  { to: "user@example.com", subject: "Hi", html: "<p>Hello</p>" },
  (err, info) => {
    if (err) return console.error(err);
    console.log("Sent:", info.response);
  },
);
```

### 13. Global template data

Set `templateData` at registration time to inject variables into every template without repeating them on every `sendMail` call.

```typescript
await fastify.register(mailerPlugin, {
  // ...
  templateData: {
    appName: "My App",
    year: new Date().getFullYear(),
    supportEmail: "support@myapp.com",
  },
});
```

### 14. Per-email template data

Pass `templateData` on individual `sendMail` calls for data specific to that email.

```typescript
await fastify.mailer.sendMail({
  to: "user@example.com",
  subject: "Your order",
  templateName: "order-confirmation",
  templateData: {
    orderId: "ORD-001",
    total: "$49.99",
  },
});
```

### 15. Template data merge with override precedence

Global `templateData` and per-email `templateData` are shallow-merged. Per-email values win on key conflicts. The global object is never mutated between calls.

```typescript
// Registration: templateData = { appName: "My App", env: "production" }
// sendMail call: templateData = { env: "staging", orderId: "ORD-1" }
// Effective templateData passed to the template:
// { appName: "My App", env: "staging", orderId: "ORD-1" }
```

### 16. Redirect all emails to fixed addresses

Set `recipients` to a non-empty array to force all outgoing emails to those addresses. The original `to`, `cc`, and `bcc` fields are overwritten or cleared. Useful for staging environments to prevent sending to real users.

```typescript
await fastify.register(mailerPlugin, {
  // ...
  recipients: ["qa@myapp.com", "staging-monitor@myapp.com"],
});

// Even though `to` is a real user address, email goes only to recipients above.
await fastify.mailer.sendMail({
  to: "real-customer@example.com",
  cc: "manager@example.com",
  subject: "Order shipped",
  html: "<p>Your order is on the way.</p>",
});
// Delivered to: qa@myapp.com, staging-monitor@myapp.com
// cc and bcc: undefined
```

When `recipients` is an empty array or omitted, the original `to`, `cc`, and `bcc` values pass through unchanged.

### 17. Conditional HTTP test route

Enable a `GET` endpoint that sends a live test email and returns a JSON confirmation. Useful for smoke-testing SMTP connectivity in deployed environments.

```typescript
await fastify.register(mailerPlugin, {
  // ...
  test: {
    enabled: true, // set to false or omit `test` entirely to disable
    path: "/internal/test-email",
    to: "ops-team@myapp.com",
  },
});

// GET /internal/test-email
// Response:
// { "status": "ok", "message": "Email successfully sent", "info": { "from": "...", "to": "..." } }
```

### 18. Inline MJML compilation in test route

The test route builds and compiles its email body inline using `mjml2html()`. It does not depend on the `templateFolder` configured for the application — no template files need to exist for the test route to work.

### 19. JSON Schema validation on test route

The test route declares response schemas for both 200 (success) and 500 (error) status codes. These are enforced by Fastify's built-in validation and serialisation.

| Status | Required fields                 |
| ------ | ------------------------------- |
| 200    | `status`, `message`, `info`     |
| 500    | `message`, `name`, `statusCode` |

### 20. OpenAPI tagging on test route

The test route is tagged `["email"]` with summary `"Test email"`. If you use `@fastify/swagger` or a compatible plugin, the route appears in the generated spec automatically.

### 21. `FastifyInstance` module augmentation

Importing `@prefabs.tech/fastify-mailer` extends Fastify's `FastifyInstance` interface with `mailer: FastifyMailer`. This gives full TypeScript type-checking on `fastify.mailer` and its methods.

```typescript
// The augmentation happens automatically on import — no extra steps needed.
import "@prefabs.tech/fastify-mailer";

// fastify.mailer is now typed as FastifyMailer everywhere
const info = await fastify.mailer.sendMail({ ... });
```

### 22. `ApiConfig` module augmentation

Importing the plugin also extends `@prefabs.tech/fastify-config`'s `ApiConfig` interface with `mailer: MailerConfig`. This makes `fastify.config.mailer` fully typed when using the config plugin.

```typescript
import "@prefabs.tech/fastify-mailer";
// fastify.config.mailer is now typed as MailerConfig
```

### 23. Exported types

Three TypeScript types are exported for use in application code:

```typescript
import type {
  FastifyMailer,
  FastifyMailerNamedInstance,
  MailerConfig,
} from "@prefabs.tech/fastify-mailer";

// Type a function that accepts the mailer
function scheduleEmail(mailer: FastifyMailer, to: string): Promise<void> {
  return mailer.sendMail({ to, subject: "Scheduled", html: "<p>Hi</p>" });
}

// Type your config object before passing to register()
const mailerConfig: MailerConfig = {
  transport: { host: "smtp.example.com", port: 587 },
  defaults: { from: { address: "noreply@myapp.com", name: "My App" } },
  templating: { templateFolder: "./templates" },
};
```

---

## Use Cases

### Use Case 1: Transactional email with an MJML template

Send a styled HTML email using a `.mjml` file stored in the template folder. Global template data (year, brand name) is set once at registration; per-call data (recipient name, order ID) is provided when sending.

```typescript
// ./src/email-templates/order-confirmation.mjml
// <mjml>
//   <mj-body>
//     <mj-section><mj-column>
//       <mj-text>Hello {{firstName}}, your order {{orderId}} has been placed.</mj-text>
//       <mj-text>© {{year}} {{appName}}</mj-text>
//     </mj-column></mj-section>
//   </mj-body>
// </mjml>

import Fastify from "fastify";
import mailerPlugin from "@prefabs.tech/fastify-mailer";

const fastify = Fastify({ logger: true });

await fastify.register(mailerPlugin, {
  transport: {
    host: "smtp.mailgun.org",
    port: 587,
    auth: { user: process.env.MG_USER!, pass: process.env.MG_PASS! },
  },
  defaults: { from: { address: "orders@myapp.com", name: "My App Orders" } },
  templating: { templateFolder: "./src/email-templates" },
  templateData: {
    appName: "My App",
    year: new Date().getFullYear(),
  },
});

await fastify.ready();

// In a route handler:
fastify.post("/orders", async (request, reply) => {
  const { customerEmail, firstName, orderId } = request.body as {
    customerEmail: string;
    firstName: string;
    orderId: string;
  };

  await fastify.mailer.sendMail({
    to: customerEmail,
    subject: `Order ${orderId} confirmed`,
    templateName: "order-confirmation",
    templateData: { firstName, orderId },
  });

  reply.send({ ok: true });
});
```

### Use Case 2: Staging environment recipient redirect

Redirect all emails to an internal team inbox during staging so real users are never contacted. The `recipients` array completely replaces `to`, `cc`, and `bcc` on every outgoing email.

```typescript
import Fastify from "fastify";
import mailerPlugin from "@prefabs.tech/fastify-mailer";

const fastify = Fastify({ logger: true });
const isStaging = process.env.NODE_ENV === "staging";

await fastify.register(mailerPlugin, {
  transport: {
    host: process.env.SMTP_HOST!,
    port: 587,
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  },
  defaults: { from: { address: "noreply@myapp.com", name: "My App" } },
  templating: { templateFolder: "./src/email-templates" },
  // Redirect all mail when on staging
  ...(isStaging && { recipients: ["staging-inbox@myapp.com"] }),
});
```

### Use Case 3: SMTP connectivity smoke test

Enable the built-in test route to confirm that the SMTP connection is working after a deployment. Hit the endpoint once and check the response.

```typescript
import Fastify from "fastify";
import mailerPlugin from "@prefabs.tech/fastify-mailer";

const fastify = Fastify({ logger: true });

await fastify.register(mailerPlugin, {
  transport: {
    host: process.env.SMTP_HOST!,
    port: 587,
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  },
  defaults: { from: { address: "noreply@myapp.com", name: "My App" } },
  templating: { templateFolder: "./src/email-templates" },
  test: {
    enabled: process.env.ENABLE_MAIL_TEST_ROUTE === "true",
    path: "/internal/smoke/email",
    to: process.env.SMOKE_TEST_EMAIL ?? "ops@myapp.com",
  },
});

await fastify.ready();
await fastify.listen({ port: 3000 });

// After startup:
// curl http://localhost:3000/internal/smoke/email
// → { "status": "ok", "message": "Email successfully sent", "info": { ... } }
```

### Use Case 4: Legacy config-driven setup via `@prefabs.tech/fastify-config`

If your application already uses `@prefabs.tech/fastify-config` to manage all configuration from environment variables or a config file, you can register `mailerPlugin` without arguments and let it read from `fastify.config.mailer`.

```typescript
import Fastify from "fastify";
import configPlugin from "@prefabs.tech/fastify-config";
import mailerPlugin from "@prefabs.tech/fastify-mailer";
// Augments ApiConfig with mailer: MailerConfig
import "@prefabs.tech/fastify-mailer";

const fastify = Fastify({ logger: true });

// configPlugin reads env vars / config files and populates fastify.config
await fastify.register(configPlugin);

// mailerPlugin finds its config at fastify.config.mailer automatically
await fastify.register(mailerPlugin);

await fastify.ready();
```

Note: this mode logs a deprecation warning. The recommended approach is to pass `MailerConfig` directly to `register()`.

### Use Case 5: Sending email with a callback

Use the Node.js-style callback API when integrating with legacy code that does not use Promises.

```typescript
fastify.mailer.sendMail(
  {
    to: "user@example.com",
    subject: "Account created",
    html: "<p>Welcome aboard!</p>",
  },
  (err, info) => {
    if (err) {
      fastify.log.error({ err }, "Failed to send welcome email");
      return;
    }
    fastify.log.info({ messageId: info.messageId }, "Welcome email sent");
  },
);
```
