# @prefabs.tech/fastify-mailer

A [Fastify](https://github.com/fastify/fastify) plugin that when registered on a Fastify instance, will decorate it with a `mailer` object for email.

## Why this plugin?

Sending production-ready emails is significantly more complex than just piping strings into NodeMailer. You must compile responsive HTML, define generic fallback text, inject dynamic payload data, and manage transport credentials securely. We created this plugin to:

- **Unify the Mailing Pipeline**: It bundles `nodemailer`, `mustache` (for variable templating), `nodemailer-mjml` (for converting elegant MJML components to cross-client compatible HTML), and `html-to-text` into a single, cohesive processing pipeline.
- **Provide a Centralized Decorator**: By decorating the Fastify instance with a structured `mailer` object, dispatching rich emails from anywhere within your application is simplified to a single, type-safe API call.

### Design Decisions: Why wrap Nodemailer instead of using external Saas SDKs?

1. **Vendor Agnosticism**: Directly integrating SDKs like SendGrid or Postmark locks your application architecture. By wrapping NodeMailer natively, you can instantly pivot between different SMTP servers (e.g., AWS SES, Mailgun, or standard SMTP) just by updating `config/mailer.ts` without touching any business logic.
2. **Template Independence**: We chose MJML and Mustache for templates to keep your email designs purely structural and inside your repository. This eliminates the dependency on third-party drag-and-drop editors and ensures your email templates are rigorously version-controlled alongside your application logic.

## Requirements

- [html-to-text](https://github.com/html-to-text/node-html-to-text)
- [mustache](https://github.com/janl/mustache.js)
- [nodemailer](https://github.com/nodemailer/nodemailer)
- [nodemailer-html-to-text](https://github.com/andris9/nodemailer-html-to-text)
- [nodemailer-mjml](https://github.com/Thomascogez/nodemailer-mjml)

## Installation

Install with npm:

```bash
npm install @prefabs.tech/fastify-mailer html-to-text mustache nodemailer nodemailer nodemailer-html-to-text nodemailer-mjml
```

Install with pnpm:

```bash
pnpm add --filter "@scope/project" @prefabs.tech/fastify-mailer html-to-text mustache nodemailer nodemailer nodemailer-html-to-text nodemailer-mjml
```

## Usage

### Register Plugin

Register @prefabs.tech/fastify-mailer package with your Fastify instance:

```typescript
import mailerPlugin from "@prefabs.tech/fastify-mailer";
import Fastify from "fastify";

import config from "./config";

const start = async () => {
  // Create fastify instance
  const fastify = Fastify({
    logger: config.logger,
  });

  // Register mailer plugin
  await fastify.register(mailerPlugin, config.mailer);

  await fastify.listen({
    host: "0.0.0.0",
    port: config.port,
  });
};

start();
```

## Configuration

To configure the mailer, add the following settings to your `config/mailer.ts` file:

```typescript
import type { MailerConfig } from "@prefabs.tech/fastify-mailer";

const mailerConfig: MailerConfig = {
  defaults: {
    from: {
      address: "test@example.com",
      name: "Test",
    },
  },
  test: {
    enabled: true,
    path: "/test/email",
    to: "user@example.com",
  },
  templating: {
    templateFolder: "mjml/templates",
  },
  templateData: {
    baseCDNUrl: "http://localhost:3000/",
  },
  transport: {
    auth: {
      pass: "pass",
      user: "user",
    },
    host: "localhost",
    port: 3001,
    requireTLS: true,
    secure: true,
  },
};

export default mailerConfig;
```
