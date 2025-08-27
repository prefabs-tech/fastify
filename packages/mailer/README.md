# @prefabs.tech/fastify-mailer

A [Fastify](https://github.com/fastify/fastify) plugin that when registered on a Fastify instance, will decorate it with a `mailer` object for email.

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
    port: config.port,
    host: "0.0.0.0",
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
