<!-- Structured feature inventory — used by automated test generation. Developer docs: see GUIDE.md -->

# @prefabs.tech/fastify-feedback — Features

## Plugin Lifecycle

1. **Enable/disable via config flag** — when `config.feedback.enabled === false`, the database migration is skipped entirely. Routes are still registered unless individually disabled. The flag defaults ON; `undefined` means enabled.

2. **Automatic database migration** — on registration (when enabled), runs `CREATE TABLE IF NOT EXISTS` for the feedbacks table, including an index on `user_id`. The table has columns `id`, `typeId` (NOT NULL), `message` (NOT NULL), `user_id`, `app_version`, `device_model`, `platform` (all nullable), `created_at`, `updated_at`.

3. **Passes slonik and config to the migration** — `runMigrations` is invoked with `fastify.slonik` and the full `config`.

## Route Registration

4. **Conditional feedback route** — `POST /feedback` is registered by default; set `config.feedback.routes.feedbacks.disabled = true` to skip registration entirely.

5. **Configurable route prefix** — the route is registered under `config.feedback.routePrefix`.

6. **Custom handler override** — the default create handler can be replaced via config:
   ```typescript
   config.feedback.handlers = {
     feedback: { createFeedback: myCreateHandler },
   };
   ```

## REST Handler

7. **Authenticated create** — `POST /feedback` runs behind `fastify.verifySession()`; the handler throws a `401 unauthorized` when `request.user` is absent.

8. **Server-set userId** — the created feedback's `userId` always comes from the session (`user.id`), never from the request body.

9. **Field passthrough** — `typeId`, `message`, `appVersion`, `deviceModel`, and `platform` from the request body are passed to `FeedbackService.create`.

## GraphQL

10. **`createFeedback` mutation** — at feature parity with the REST route, guarded by the `@auth` directive.

11. **Disabled guard** — the resolver returns a `404` `ErrorWithProps` when `config.feedback.enabled === false`.

12. **Unauthorized guard** — the resolver returns a `401` `ErrorWithProps` when there is no `user` in the mercurius context.

13. **Error guard** — the resolver returns a `500` `ErrorWithProps` and logs when the service throws.

## Data Layer

14. **Configurable table name** — `FeedbackSqlFactory.table` and the migration honor `config.feedback.table.feedbacks.name`, falling back to the constant `feedbacks`.

15. **Base service create** — `FeedbackService` extends `BaseService`, reusing `DefaultSqlFactory` for insert query building and camelCase ⇄ snake_case conversion.
