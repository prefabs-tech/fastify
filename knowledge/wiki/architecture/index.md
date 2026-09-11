# Architecture

Cross-cutting structure — the couplings and orderings that no single file makes obvious.

# Concepts

- [Plugin Registration Order](plugin-registration-order.md) - The order a consuming app must register the prefabs plugins in, and the concrete coupling that makes each ordering constraint hold.
- [REST Request Lifecycle](rest-request-lifecycle.md) - How an authenticated REST request moves through request decorators, body parsing, SuperTokens session verification, permission checks, a thin handler, the service layer, and the error handler.
- [GraphQL Request Lifecycle](graphql-request-lifecycle.md) - How a /graphql request is parsed, how its mercurius context is built and extended by plugins, and how the @auth and @hasPermission directives enforce the same rules as REST.
- [Data Access Layer](data-access-layer.md) - How BaseService, DefaultSqlFactory, the filter builder, and the slonik interceptors turn a service call into typed SQL, including hook dispatch, soft delete, pagination, and the camelCase/snake_case boundary.
- [Plugin Options Migration](plugin-options-migration.md) - The in-progress move from plugins reading fastify.config to plugins receiving options at register(); which packages have moved, how the fallback is detected, and where the old config shape is still load-bearing.
- [Monorepo Build Graph](build-graph.md) - What depends on what across the ten packages, why tests and typechecks consume siblings from dist/ without building them, and what the Vite library build externalizes.
