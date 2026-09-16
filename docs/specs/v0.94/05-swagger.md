# 05 — `@prefabs.tech/fastify-swagger`

Registers `@fastify/swagger` and `@fastify/swagger-ui` together behind one
option object, and records where the UI ended up.

Peers: `fastify`, `fastify-plugin`. No sibling peers — this package is
independent and can be registered anywhere in the sequence.

## Registration

```typescript
import swaggerPlugin from "@prefabs.tech/fastify-swagger";

await fastify.register(swaggerPlugin, {
  enabled: config.env !== "production",
  fastifySwaggerOptions: {
    openapi: {
      info: { title: "My API", version: config.version },
      servers: [{ url: config.baseUrl }],
    },
  },
  uiOptions: {
    routePrefix: "/docs",
    uiConfig: { deepLinking: true },
  },
});
```

| Option | Type | Required | Notes |
|---|---|---|---|
| `fastifySwaggerOptions` | `SwaggerOptions` from `@fastify/swagger` | yes | Passed through unchanged |
| `uiOptions` | `FastifySwaggerUiOptions` | no | Defaults to `{}`; passed through unchanged |
| `enabled` | `boolean` | no | Only `false` disables — omitted means enabled |

Both option objects are full pass-throughs. See
[`@fastify/swagger`](https://github.com/fastify/fastify-swagger) and
[`@fastify/swagger-ui`](https://github.com/fastify/fastify-swagger-ui) for what
they accept; this package adds no options of its own beyond `enabled`.

## What it adds

| Surface | Value |
|---|---|
| `fastify.swaggerUIRoutePrefix` | `uiOptions.routePrefix ?? "/documentation"` |
| `fastify.apiDocumentationPath` | the same value |

Both are typed `string | undefined` because both are `undefined` when the
plugin is disabled. The two decorators always resolve to the same string; they
exist as a pair for readability at call sites.

```typescript
fastify.get("/", async () => ({
  docs: `${fastify.hostname}${fastify.apiDocumentationPath}`,
}));
```

## Disabling

```typescript
await fastify.register(swaggerPlugin, {
  enabled: false,
  fastifySwaggerOptions: { openapi: {} },
});
// neither child plugin is registered; fastify.swagger is undefined,
// and both decorators are undefined
```

When disabled, nothing is registered at all — including `fastify.swagger`
itself. Code that generates the spec at runtime (`fastify.swagger()`) must
guard for that.

## Documenting routes

The plugin only wires the tooling; documentation comes from the JSON schemas on
your routes. The sibling packages already ship schemas with `description`,
`operationId`, `tags`, and typed responses, so their routes appear in the
document automatically once this plugin is registered.

```typescript
fastify.get("/widgets/:id", {
  schema: {
    description: "Fetch a widget by id",
    operationId: "getWidget",
    params: { properties: { id: { type: "string" } }, required: ["id"], type: "object" },
    response: {
      200: widgetSchema,
      404: { $ref: "ErrorResponse#", description: "Widget not found" },
    },
    tags: ["widgets"],
  },
}, handler);
```

The `$ref: "ErrorResponse#"` resolves only if
`@prefabs.tech/fastify-error-handler` is registered — see chapter 02.

### File upload fields

For a multipart route to render as a file input, the field needs
`format: "binary"`. The s3 package's `ajvFilePlugin` does that rewrite for you
from an `isFile: true` keyword — see chapter 07.
