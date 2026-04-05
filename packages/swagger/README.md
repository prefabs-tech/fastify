# @prefabs.tech/fastify-swagger

A [Fastify](https://github.com/fastify/fastify) plugin that provides an easy integration of swagger in fastify API.

## Why this plugin?

In any moderately sized back-end application, maintaining OpenAPI documentation manually inevitably leads to discrepancies between actual route logic and API docs. This plugin seamlessly exposes a beautifully rendered Swagger interface out of your existing Fastify routes. We created this plugin to:

- **Automate API Documentation**: Seamlessly parse existing Fastify JSON-schemas bound to your HTTP routes and instantly render a polished Swagger UI portal without dedicating extra engineering hours to manual documentation writing.
- **Integrate Global Configuration**: Effortlessly hook the swagger rendering preferences, base paths, and API spec metadata natively via our unified `@prefabs.tech/fastify-config` ecosystem.

### Design Decisions: Why wrap @fastify/swagger?

- **Config Standardization**: Wrapping `@fastify/swagger` and `@fastify/swagger-ui` behind our unified plugin mechanism forces the Swagger metadata configurations to match our strict standard monorepo constraints. Instead of repeating fastify setup boilerplate configurations in every sub-service, developers can instantiate beautifully documented APIs using a strictly typed, one-line configuration object.

## Installation

Install with npm:

```bash
npm install @prefabs.tech/fastify-swagger
```

Install with pnpm:

```bash
pnpm add --filter "@scope/project @prefabs.tech/fastify-swagger
```

## Configuration

To configure the swagger, add the following settings to your `config/swagger.ts` file:

```typescript
import type { SwaggerOptions } from "@prefabs.tech/fastify-swagger";

const swaggerConfig: SwaggerOptions = {
  enabled: true,
  fastifySwaggerOptions: {
    openapi: {
      info: {
        title: "Test API",
        version: "1.0.0",
      },
      servers: [
        {
          description: "Development server",
          url: "http://localhost:3000",
        },
      ],
    },
  },
};

export default swaggerConfig;
```

## Usage

Register the plugin with your Fastify instance:

```typescript
import Fastify from "fastify";
import swaggerPlugin from "@prefabs.tech/fastify-swagger";

import swaggerConfig from "./config/swagger";

const start = async () => {
  // Create fastify instance
  const fastify = Fastify();

  await fastify.register(swaggerPlugin, swaggerOptions);

  await fastify.listen({
    host: "0.0.0.0",
    port: 3000,
  });
};

start();
```
