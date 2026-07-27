<!-- Structured feature inventory — used by automated test generation. Developer docs: see GUIDE.md -->

# @prefabs.tech/fastify-feedback — Features

## Plugin Lifecycle

1. **Enable/disable via config flag** — when `config.feedback.enabled === false`, the database migration is skipped entirely and `"fastify-feedback plugin is not enabled"` is logged. The flag defaults ON; `undefined` means enabled.

2. **`enabled` does not gate REST route registration** — routes are registered from `config.feedback.routes` regardless of `enabled`. The GraphQL resolver, by contrast, does check `enabled` at call time (see #14). Disabling only stops the migration on the REST side.

3. **Automatic database migration** — on registration (when enabled), runs `CREATE TABLE IF NOT EXISTS` for the feedbacks table, including an index on `user_id`. The table has columns `id`, `type_id` (NOT NULL), `message` (NOT NULL), `user_id`, `app_version`, `device_model`, `platform` (all nullable), `created_at`, `updated_at`.

4. **Passes slonik and config to the migration** — `runMigrations` is invoked with `fastify.slonik` and the full `config`.

## Route Registration

5. **Conditional feedback route** — `POST /feedbacks` is registered by default; set `config.feedback.routes.feedbacks.disabled = true` to skip registration entirely.

6. **Configurable route prefix** — the route is registered under `config.feedback.routePrefix`.

7. **Custom handler override** — the default create handler can be replaced via config:
   ```typescript
   config.feedback.handlers = {
     feedback: { createFeedback: myCreateHandler },
   };
   ```

8. **Route schema metadata** — the POST route carries `operationId: "createFeedback"`, `tags: ["feedback"]`, a `description`, and `401`/`500` responses declared as `$ref: "ErrorResponse#"` (the schema must be registered by `@prefabs.tech/fastify-error-handler`, or route registration fails).

9. **Response serialization** — the `200` response schema enumerates `id`, `typeId`, `message`, `appVersion`, `deviceModel`, `platform`, `userId`, `createdAt`, `updatedAt`; any additional property returned by the service is stripped from the response.

## REST Handler

10. **Authenticated create** — `POST /feedbacks` runs behind `fastify.verifySession()`; the handler throws a `401 unauthorized` when `request.user` is absent.

11. **Server-set userId** — the created feedback's `userId` always comes from the session (`user.id`), never from the request body.

12. **Field passthrough** — `typeId`, `message`, `appVersion`, `deviceModel`, and `platform` from the request body are passed to `FeedbackService.create`. Body validation requires `typeId` and `message`.

## GraphQL

13. **`createFeedback` mutation** — at feature parity with the REST route, guarded by the `@auth` directive from `@prefabs.tech/fastify-graphql`.

14. **Disabled guard** — the resolver *returns* (does not throw) a `404` `mercurius.ErrorWithProps` when `config.feedback.enabled === false`.

15. **Unauthorized guard** — the resolver returns a `401` `ErrorWithProps` when there is no `user` in the mercurius context.

16. **Error guard** — the resolver returns a `500` `ErrorWithProps` and logs via `app.log.error` when the service throws.

17. **Merged schema export** — `feedbackSchema` (from `src/graphql/schema.ts`) is `mergeTypeDefs([baseSchema, feedbackSchema])`, i.e. the feedback SDL already merged with the `@prefabs.tech/fastify-graphql` base schema, not the feedback SDL alone.

## Data Layer

18. **Configurable table name** — `FeedbackSqlFactory.table` and the migration honor `config.feedback.table.feedbacks.name`, falling back to the constant `feedbacks`.

19. **Base service create** — `FeedbackService` extends `BaseService`, reusing `DefaultSqlFactory` for insert query building and camelCase ⇄ snake_case conversion.

## Public API

20. **Module augmentations** — `declare module` blocks add `FastifyInstance.verifySession`, `FastifyRequest.user?: User`, `MercuriusContext.user`, and the `feedback` namespace on `@prefabs.tech/fastify-config`'s `ApiConfig`.

21. **Type exports** — `Feedback`, `FeedbackCreateInput`, `FeedbackUpdateInput`, `User`.

22. **Value exports** — default export is the plugin; named: `FeedbackService`, `feedbackRoutes` (the controller sub-plugin), `feedbackResolver`, `feedbackSchema`, `createFeedbacksTableQuery`, `ROUTE_FEEDBACK`, `TABLE_FEEDBACKS`. `FeedbackSqlFactory` and `postFeedbackSchema` are internal and not exported.
