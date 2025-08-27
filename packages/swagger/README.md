# @prefabs.tech/fastify-swagger

A [Fastify](https://github.com/fastify/fastify) plugin that provides an easy integration of swagger in fastify API.


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
        url: 'http://localhost:3000',
        description: 'Development server'
      }
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
import swaggerPlugin from "@prefabs.tech/fastify-swagger"

import swaggerConfig from "./config/swagger"

const start = async () => {
  // Create fastify instance
  const fastify = Fastify();

  await fastify.register(swaggerPlugin, swaggerOptions);

  await fastify.listen({
    port: 3000,
    host: "0.0.0.0",
  });
};

start();
```

