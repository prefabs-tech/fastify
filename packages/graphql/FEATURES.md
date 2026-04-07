<!-- Structured feature inventory — used by automated test generation. Developer docs: see GUIDE.md -->

# @prefabs.tech/fastify-graphql — Features

## Plugin Registration

1. **Conditional mercurius registration** — when `enabled` is falsy, mercurius is not registered and `"GraphQL API not enabled"` is logged; the Fastify instance continues without a `/graphql` endpoint.

2. **Config fallback** — when options object is empty (no options passed directly to `register()`), the plugin reads `fastify.config.graphql` and uses that as the options. Logs a warning when falling back. Throws `"Missing graphql configuration"` if `fastify.config.graphql` is also undefined.

## Context Building

3. **Automatic context building** — on every GraphQL request, `config` (from `request.config`), `database` (from `request.slonik`), and `dbSchema` (from `request.dbSchema`) are pulled from the Fastify request decorators and injected into the Mercurius context automatically.

4. **Plugin-based context extension** — plugins listed in `options.plugins` have their `updateContext(context, request, reply)` method called per-request, in array order, allowing each to add or modify fields on the Mercurius context.

## Types & Module Augmentation

5. **`GraphqlConfig` interface** — extends `MercuriusOptions` with two additional fields: `enabled?: boolean` and `plugins?: GraphqlEnabledPlugin[]`.

6. **`GraphqlOptions` type alias** — exported alias for `GraphqlConfig`.

7. **`GraphqlEnabledPlugin` interface** — a type that extends both `FastifyPluginAsync` and `FastifyPluginCallback`, plus carries an `updateContext(context: MercuriusContext, request: FastifyRequest, reply: FastifyReply): Promise<void>` method required by the context extension system.

8. **`MercuriusContext` augmentation** — adds typed `config: ApiConfig`, `database: Database`, and `dbSchema: string` to the global `mercurius` module's `MercuriusContext` interface.

9. **`ApiConfig` augmentation** — adds `graphql: GraphqlConfig` to `@prefabs.tech/fastify-config`'s `ApiConfig` interface, making `fastify.config.graphql` fully typed.

## Built-in Schema

10. **`baseSchema` export** — a `DocumentNode` (parsed with `gql`) containing ready-to-merge GraphQL definitions:
    - `@auth(profileValidation: Boolean, emailVerification: Boolean)` directive on `OBJECT | FIELD_DEFINITION`
    - `@hasPermission(permission: String!)` directive on `OBJECT | FIELD_DEFINITION`
    - `DateTime` scalar
    - `JSON` scalar
    - `Filters` input — recursive `AND: [Filters]`, `OR: [Filters]`, `not: Boolean`, `key: String`, `operator: String`, `value: String`
    - `SortDirection` enum — `ASC | DESC`
    - `SortInput` input — `key: String`, `direction: SortDirection`
    - `DeleteResult` type — `result: Boolean!`

## Re-exports

11. **`mergeTypeDefs`** re-exported from `@graphql-tools/merge` — merges multiple `DocumentNode` or string schemas into one `DocumentNode`.

12. **`gql`** tag re-exported from `graphql-tag` — parses GraphQL template literals into `DocumentNode`.

13. **`DocumentNode`** type re-exported from `graphql`.
