<!-- Structured feature inventory — used by automated test generation. Developer docs: see GUIDE.md -->

# @prefabs.tech/fastify-graphql — Features

## Plugin Registration

1. **Registration lifecycle logging** — the plugin logs `"Registering fastify-graphql plugin"` when registration starts. It logs a warning when using config fallback and logs `"GraphQL API not enabled"` when `enabled` is falsy.

2. **Conditional mercurius registration** — when `enabled` is falsy, mercurius is not registered and `"GraphQL API not enabled"` is logged; the Fastify instance continues without a `/graphql` endpoint.

3. **Config fallback** — when options object is empty (no options passed directly to `register()`), the plugin reads `fastify.config.graphql` and uses that as the options. Logs a warning when falling back. Throws `"Missing graphql configuration"` if `fastify.config.graphql` is also undefined.

## Context Building

4. **Default context factory** — when mercurius is registered, the plugin sets `context: buildContext(options.plugins)` first, then spreads `...options`. If a caller passes `options.context`, that caller-provided context overrides the default factory.

5. **Automatic context building (default path)** — when the default context factory is used, each GraphQL request gets `config` (from `request.config`), `database` (from `request.slonik`), and `dbSchema` (from `request.dbSchema`) injected into Mercurius context.

6. **Plugin-based context extension** — with the default context factory, plugins listed in `options.plugins` have `updateContext(context, request, reply)` called per-request, in array order, so each plugin can extend the shared Mercurius context.

## Types & Module Augmentation

7. **`GraphqlConfig` interface** — extends `MercuriusOptions` with two additional fields: `enabled?: boolean` and `plugins?: GraphqlEnabledPlugin[]`.

8. **`GraphqlOptions` type alias** — exported alias for `GraphqlConfig`.

9. **`GraphqlEnabledPlugin` interface** — a type that extends both `FastifyPluginAsync` and `FastifyPluginCallback`, plus carries an `updateContext(context: MercuriusContext, request: FastifyRequest, reply: FastifyReply): Promise<void>` method required by the context extension system.

10. **`MercuriusContext` augmentation** — adds typed `config: ApiConfig`, `database: Database`, and `dbSchema: string` to the global `mercurius` module's `MercuriusContext` interface.

11. **`ApiConfig` augmentation** — adds `graphql: GraphqlConfig` to `@prefabs.tech/fastify-config`'s `ApiConfig` interface, making `fastify.config.graphql` fully typed.

## Built-in Schema

12. **`baseSchema` export** — a `DocumentNode` (parsed with `gql`) containing ready-to-merge GraphQL definitions:
    - `@auth(profileValidation: Boolean, emailVerification: Boolean)` directive on `OBJECT | FIELD_DEFINITION`
    - `@hasPermission(permission: String!)` directive on `OBJECT | FIELD_DEFINITION`
    - `DateTime` scalar
    - `JSON` scalar
    - `Filters` input — recursive `AND: [Filters]`, `OR: [Filters]`, `not: Boolean`, `key: String`, `operator: String`, `value: String`
    - `SortDirection` enum — `ASC | DESC`
    - `SortInput` input — `key: String`, `direction: SortDirection`
    - `DeleteResult` type — `result: Boolean!`

## Re-exports

13. **`mergeTypeDefs`** re-exported from `@graphql-tools/merge` — merges multiple `DocumentNode` or string schemas into one `DocumentNode`.

14. **`gql`** tag re-exported from `graphql-tag` — parses GraphQL template literals into `DocumentNode`.

15. **`DocumentNode`** type re-exported from `graphql`.
