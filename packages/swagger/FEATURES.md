<!-- Structured feature inventory — used by automated test generation. Developer docs: see GUIDE.md -->

## Plugin Registration

1. Registers `@fastify/swagger` and `@fastify/swagger-ui` together as a single plugin using one unified options object.
2. Wrapped with `fastify-plugin` so decorators and routes escape encapsulation and are available to the parent scope.

## Configuration

3. Accepts a single `SwaggerOptions` object with three fields: `fastifySwaggerOptions` (required), `uiOptions` (optional), and `enabled` (optional).
4. `enabled` flag (`boolean`, optional) — when explicitly `false`, skips all plugin registration; no child plugins are registered and no decorators are added.

   ```typescript
   await fastify.register(swaggerPlugin, {
     enabled: false,
     fastifySwaggerOptions: { openapi: {} },
   });
   // fastify.swagger, fastify.swaggerUIRoutePrefix, fastify.apiDocumentationPath → all undefined
   ```

5. `uiOptions` defaults to `{}` when omitted — `@fastify/swagger-ui` is always registered (with its own defaults) unless `enabled` is `false`.

## Fastify Instance Decorators

6. Decorates `fastify.swaggerUIRoutePrefix` with the value of `uiOptions.routePrefix`, falling back to `"/documentation"` when `uiOptions` is omitted or `routePrefix` is not set.
7. Decorates `fastify.apiDocumentationPath` with the same value as `swaggerUIRoutePrefix` (both always resolve to the same string).
8. Both decorators are typed on `FastifyInstance` via a module augmentation as `string | undefined` — they are `undefined` when `enabled` is `false`.

## Type Exports

9. Exports the `SwaggerOptions` type for consumers to type their own configuration objects.
