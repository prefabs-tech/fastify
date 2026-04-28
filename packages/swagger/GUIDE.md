# @prefabs.tech/fastify-swagger — Developer Guide

## Installation

### For package consumers (npm + pnpm)

```bash
# npm
npm install @prefabs.tech/fastify-swagger fastify fastify-plugin

# pnpm
pnpm add @prefabs.tech/fastify-swagger fastify fastify-plugin
```

### For monorepo development (pnpm install / test / build)

```bash
# from the repo root
pnpm install

# run tests for this package only
pnpm --filter @prefabs.tech/fastify-swagger test

# build
pnpm --filter @prefabs.tech/fastify-swagger build
```

## Setup

The plugin registers both `@fastify/swagger` (spec generation) and `@fastify/swagger-ui` (UI serving) in one call. `fastifySwaggerOptions` is the only required field.

```typescript
import Fastify from "fastify";
import swaggerPlugin, {
  type SwaggerOptions,
} from "@prefabs.tech/fastify-swagger";

const fastify = Fastify({ logger: true });

const swaggerConfig: SwaggerOptions = {
  fastifySwaggerOptions: {
    openapi: {
      info: {
        title: "My API",
        version: "1.0.0",
        description: "Public API documentation",
      },
    },
  },
  uiOptions: {
    routePrefix: "/docs",
  },
};

await fastify.register(swaggerPlugin, swaggerConfig);
await fastify.ready();

// Decorators are now available:
console.log(fastify.swaggerUIRoutePrefix); // "/docs"
console.log(fastify.apiDocumentationPath); // "/docs"

await fastify.listen({ port: 3000 });
```

All later examples assume this setup is already in place unless stated otherwise.

---

## Base Libraries

### `@fastify/swagger` — Full Passthrough

Their docs: https://www.npmjs.com/package/@fastify/swagger

This plugin passes the `fastifySwaggerOptions` value directly to `fastify.register(fastifySwagger, fastifySwaggerOptions)` without modification. Every option documented by `@fastify/swagger` (OpenAPI / Swagger 2 spec config, `mode`, `transform`, `refResolver`, etc.) is fully supported. We add nothing on top of `@fastify/swagger`'s behaviour.

### `@fastify/swagger-ui` — Full Passthrough

Their docs: https://www.npmjs.com/package/@fastify/swagger-ui

`uiOptions` is passed directly to `fastify.register(swaggerUi, uiOptions ?? {})` without modification. Every option documented by `@fastify/swagger-ui` (`routePrefix`, `uiConfig`, `logo`, `theme`, `staticCSP`, etc.) is fully supported. The only behaviour we add is reading `uiOptions.routePrefix` to populate our own decorators (see below).

---

## Features

### 1. Single-plugin registration for swagger + swagger-ui (Feature 1)

One `fastify.register` call installs both `@fastify/swagger` and `@fastify/swagger-ui`, keeping your bootstrap code concise.

```typescript
// Before (without this wrapper)
await fastify.register(fastifySwagger, {
  openapi: { info: { title: "API", version: "1" } },
});
await fastify.register(swaggerUi, { routePrefix: "/docs" });

// After (with this wrapper)
await fastify.register(swaggerPlugin, {
  fastifySwaggerOptions: { openapi: { info: { title: "API", version: "1" } } },
  uiOptions: { routePrefix: "/docs" },
});
```

### 2. Plugin scope escaping via `fastify-plugin` (Feature 2)

The plugin is wrapped with `fastify-plugin`, which disables Fastify's encapsulation boundary. Decorators and routes added by `@fastify/swagger` and `@fastify/swagger-ui` — as well as the decorators this plugin adds — are visible to the parent scope without needing to hoist the registration.

```typescript
await fastify.register(swaggerPlugin, {
  fastifySwaggerOptions: { openapi: {} },
});
await fastify.ready();

// Available on the root instance, not just inside a child scope:
fastify.swagger(); // works
fastify.swaggerUIRoutePrefix; // works
```

### 3. Unified `SwaggerOptions` configuration type (Feature 3)

A single typed options object groups all configuration in one place. `fastifySwaggerOptions` is required; `uiOptions` and `enabled` are optional.

```typescript
import type { SwaggerOptions } from "@prefabs.tech/fastify-swagger";

const config: SwaggerOptions = {
  // Required — passed straight to @fastify/swagger
  fastifySwaggerOptions: {
    openapi: {
      info: { title: "My API", version: "2.0.0" },
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer" },
        },
      },
    },
  },
  // Optional — passed straight to @fastify/swagger-ui
  uiOptions: {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list" },
  },
  // Optional — set to false to disable entirely
  enabled: true,
};
```

### 4. `enabled` flag to disable all swagger registration (Feature 4)

Setting `enabled: false` causes the plugin to exit immediately after logging an info message. Neither `@fastify/swagger` nor `@fastify/swagger-ui` is registered, and no decorators are added to the instance. This is useful for disabling API docs in production builds without changing your registration code.

```typescript
const isProduction = process.env.NODE_ENV === "production";

await fastify.register(swaggerPlugin, {
  enabled: !isProduction,
  fastifySwaggerOptions: {
    openapi: { info: { title: "API", version: "1.0.0" } },
  },
  uiOptions: { routePrefix: "/docs" },
});

await fastify.ready();

if (isProduction) {
  // None of these are defined:
  console.log(fastify.swaggerUIRoutePrefix); // undefined
  console.log(fastify.apiDocumentationPath); // undefined
  console.log(fastify.swagger); // undefined
}
```

When `enabled` is omitted or is any value other than `false`, registration proceeds normally.

### 5. `uiOptions` defaults to `{}` when omitted (Feature 5)

If `uiOptions` is not supplied, `@fastify/swagger-ui` is still registered with an empty options object, picking up its own defaults (UI served at `/documentation`).

```typescript
// uiOptions omitted — UI still served at /documentation
await fastify.register(swaggerPlugin, {
  fastifySwaggerOptions: { openapi: {} },
});
await fastify.ready();

// Confirmed by the decorator value:
console.log(fastify.swaggerUIRoutePrefix); // "/documentation"
```

### 6. `fastify.swaggerUIRoutePrefix` decorator (Feature 6)

After the plugin is ready, `fastify.swaggerUIRoutePrefix` holds the route prefix under which the Swagger UI is served. The value comes from `uiOptions.routePrefix`; if that is absent, it defaults to `"/documentation"`.

```typescript
await fastify.register(swaggerPlugin, {
  fastifySwaggerOptions: { openapi: {} },
  uiOptions: { routePrefix: "/api-docs" },
});
await fastify.ready();

console.log(fastify.swaggerUIRoutePrefix); // "/api-docs"

// Use it to construct links or redirect logic:
fastify.get("/", async (_req, reply) => {
  reply.redirect(fastify.swaggerUIRoutePrefix!);
});
```

### 7. `fastify.apiDocumentationPath` decorator (Feature 7)

`fastify.apiDocumentationPath` is a second decorator set to the same value as `swaggerUIRoutePrefix`. It exists as a semantically distinct name that other plugins or application code can reference without being coupled to the "Swagger UI" concept specifically.

```typescript
await fastify.register(swaggerPlugin, {
  fastifySwaggerOptions: { openapi: {} },
});
await fastify.ready();

// Both resolve identically:
console.log(fastify.swaggerUIRoutePrefix); // "/documentation"
console.log(fastify.apiDocumentationPath); // "/documentation"
```

### 8. Module augmentation for `FastifyInstance` types (Feature 8)

`src/index.ts` extends the `FastifyInstance` interface so TypeScript knows about both decorators without extra type assertions. The type is `string | undefined` — `undefined` when `enabled` is `false`.

```typescript
import type { FastifyInstance } from "fastify";

// No type assertion needed:
function logDocsPath(fastify: FastifyInstance) {
  const path: string | undefined = fastify.apiDocumentationPath;
  if (path) {
    console.log(`Docs available at ${path}`);
  }
}
```

### 9. `SwaggerOptions` type export (Feature 9)

The `SwaggerOptions` type is re-exported from the package entry point, letting consumers type their own configuration files or factory functions without importing from internal paths.

```typescript
import type { SwaggerOptions } from "@prefabs.tech/fastify-swagger";

function buildSwaggerConfig(title: string, version: string): SwaggerOptions {
  return {
    fastifySwaggerOptions: {
      openapi: { info: { title, version } },
    },
  };
}
```

---

## Use Cases

### Serving interactive API docs during development only

Disable Swagger in production to avoid exposing internal API structure, while keeping it active in development and staging.

```typescript
import Fastify from "fastify";
import swaggerPlugin from "@prefabs.tech/fastify-swagger";

const fastify = Fastify({ logger: true });

await fastify.register(swaggerPlugin, {
  enabled: process.env.NODE_ENV !== "production",
  fastifySwaggerOptions: {
    openapi: {
      info: { title: "Internal API", version: "1.0.0" },
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer" },
        },
      },
    },
  },
  uiOptions: {
    routePrefix: "/docs",
    uiConfig: { persistAuthorization: true },
  },
});

await fastify.listen({ port: 3000 });
```

### Redirecting the root path to API docs

Use `apiDocumentationPath` to wire a root-level redirect without hardcoding the docs path in multiple places.

```typescript
import Fastify from "fastify";
import swaggerPlugin from "@prefabs.tech/fastify-swagger";

const fastify = Fastify({ logger: true });

await fastify.register(swaggerPlugin, {
  fastifySwaggerOptions: {
    openapi: { info: { title: "My API", version: "1.0.0" } },
  },
  uiOptions: { routePrefix: "/docs" },
});

// After ready(), apiDocumentationPath is guaranteed to be set
await fastify.ready();

fastify.get("/", async (_req, reply) => {
  reply.redirect(fastify.apiDocumentationPath!);
});

await fastify.listen({ port: 3000 });
```

### Annotating routes and generating an OpenAPI spec

Register routes with JSON Schema annotations and retrieve the generated OpenAPI document via `fastify.swagger()` (provided by `@fastify/swagger`).

```typescript
import Fastify from "fastify";
import swaggerPlugin from "@prefabs.tech/fastify-swagger";

const fastify = Fastify();

// Route registered before or after plugin — both work
fastify.get(
  "/users/:id",
  {
    schema: {
      params: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
      response: {
        200: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
          },
        },
      },
    },
  },
  async (req) => ({ id: req.params.id, name: "Alice" }),
);

await fastify.register(swaggerPlugin, {
  fastifySwaggerOptions: {
    openapi: { info: { title: "Users API", version: "1.0.0" } },
  },
});

await fastify.ready();

const spec = fastify.swagger();
console.log(JSON.stringify(spec, null, 2));
// Outputs fully generated OpenAPI 3.x document
```

### Sharing the docs route prefix across the application

Expose `swaggerUIRoutePrefix` via an application-level config endpoint so clients can discover where docs are served.

```typescript
import Fastify from "fastify";
import swaggerPlugin from "@prefabs.tech/fastify-swagger";

const fastify = Fastify();

await fastify.register(swaggerPlugin, {
  fastifySwaggerOptions: {
    openapi: { info: { title: "API", version: "1.0.0" } },
  },
  uiOptions: { routePrefix: "/api-docs" },
});

await fastify.ready();

fastify.get("/meta", async () => ({
  docsUrl: fastify.swaggerUIRoutePrefix,
}));

// GET /meta → { "docsUrl": "/api-docs" }
```
