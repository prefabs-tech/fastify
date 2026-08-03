# @prefabs.tech/fastify-phone-auth

A [Fastify](https://github.com/fastify/fastify) plugin that adds phone/SMS OTP passwordless login to an API built on [@prefabs.tech/fastify-user](../user/), backed by the [Twilio Verify](https://www.twilio.com/docs/verify) API.

## Why this plugin?

SuperTokens ships a Passwordless recipe, but wiring it to Twilio Verify and to your own `users` table is a surprising amount of work — SuperTokens wants to own the OTP, Twilio Verify wants to own the OTP, and neither knows about your database. This plugin exists to:

- **Bridge SuperTokens and Twilio Verify**: Twilio Verify generates, delivers and checks the real OTP; SuperTokens is handed a placeholder code so its own flow still completes. All of that is hidden behind one plugin registration.
- **Keep the auth package lean**: passwordless is opt-in. Apps that do not use it never install `twilio`, and `@prefabs.tech/fastify-user` carries no passwordless config surface.
- **Initialise the recipe automatically**: registering this plugin is all it takes — the SuperTokens Passwordless recipe is contributed to `@prefabs.tech/fastify-user`'s recipe list for you.
- **Create the local user row**: on first sign-in a matching row is created in your `users` table with the phone number and a synthetic `<phoneNumber>@<fallbackEmailDomain>` email, since SuperTokens requires an email.
- **Own the `phone_number` column**: an idempotent migration adds it to the users table, the `User` type from `@prefabs.tech/fastify-user` is augmented with `phoneNumber?: string`, and the GraphQL `User` type is extended at runtime — no wiring on your side.
- **Support local development without Twilio**: a dev mode and a per-number bypass list accept a fixed OTP so you can develop and test without sending real SMS.

## Requirements

Peer dependencies (install compatible versions — see [package.json](./package.json)):

- [@prefabs.tech/fastify-config](../config/)
- [@prefabs.tech/fastify-error-handler](../error-handler/)
- [@prefabs.tech/fastify-slonik](../slonik/)
- [@prefabs.tech/fastify-user](../user/)
- [`fastify`](https://www.npmjs.com/package/fastify)
- [`fastify-plugin`](https://www.npmjs.com/package/fastify-plugin)
- [`slonik`](https://www.npmjs.com/package/slonik)
- [`supertokens-node`](https://www.npmjs.com/package/supertokens-node)

## Installation

Install with npm:

```bash
npm install @prefabs.tech/fastify-config @prefabs.tech/fastify-error-handler @prefabs.tech/fastify-slonik @prefabs.tech/fastify-user @prefabs.tech/fastify-phone-auth fastify fastify-plugin slonik supertokens-node
```

Install with pnpm:

```bash
pnpm add --filter "@scope/project" @prefabs.tech/fastify-config @prefabs.tech/fastify-error-handler @prefabs.tech/fastify-slonik @prefabs.tech/fastify-user @prefabs.tech/fastify-phone-auth fastify fastify-plugin slonik supertokens-node
```

## Usage

### Register the plugin — before `@prefabs.tech/fastify-user`

SuperTokens allows exactly one global `init()`, and `@prefabs.tech/fastify-user` performs it while it is being registered. This plugin therefore has to be registered **first**, so its recipe is in the list by the time that happens.

```typescript
import configPlugin from "@prefabs.tech/fastify-config";
import phoneAuthPlugin from "@prefabs.tech/fastify-phone-auth";
import slonikPlugin from "@prefabs.tech/fastify-slonik";
import userPlugin from "@prefabs.tech/fastify-user";
import Fastify from "fastify";

const fastify = Fastify();

await fastify.register(configPlugin, { config });
await fastify.register(slonikPlugin);
await fastify.register(phoneAuthPlugin); // contributes the recipe
await fastify.register(userPlugin); // runs supertokens.init()
```

Registering it after `@prefabs.tech/fastify-user` throws:

```
SuperTokens is already initialised. Register SuperTokens recipe plugins before @prefabs.tech/fastify-user.
```

### Configuration

```typescript
const config: ApiConfig = {
  // ...
  phoneAuth: {
    fallbackEmailDomain: "example.com",
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID,
    },
  },
};
```

For local development, skip Twilio entirely:

```typescript
phoneAuth: {
  devModeOtp: "123456",
  enableDevMode: true,
  fallbackEmailDomain: "example.com",
}
```

See the [developer guide](./GUIDE.md) for the full configuration reference, the SuperTokens endpoints this exposes, and the override hooks.
