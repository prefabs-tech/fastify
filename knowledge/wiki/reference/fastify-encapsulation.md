---
type: Explainer
title: Fastify Encapsulation in This Repo
description: The Fastify 5 plugin mechanics every package relies on (fastify-plugin wrapping, decorators vs per-request assignment, idempotency guards, named plugins, parser snapshotting, onReady, the single error handler) and where each shows up in the code.
tags: [fastify, reference, encapsulation, fastify-plugin, decorators, hooks]
status: draft
stale_after: 2027-03-11
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: slonik-plugin
    resource: repo://packages/slonik/src/plugin.ts#L42
    title: Plugins exported wrapped in FastifyPlugin
  - id: firebase-plugin
    resource: repo://packages/firebase/src/plugin.ts#L23-L34
    title: Controllers registered with a prefix
  - id: firebase-controller
    resource: repo://packages/firebase/src/model/userDevice/controller.ts#L11-L33
    title: Controllers exported unwrapped
  - id: commit-async
    resource: repo://packages/user/src/plugin.ts
    title: "Commit b0a11405, 2025-02-19: fix: fix plugins being registered mixes async and callback styles (#891)"
  - id: config-plugin
    resource: repo://packages/config/src/plugin.ts#L13-L17
    title: decorate + onRequest assignment
  - id: slonik-decorators
    resource: repo://packages/slonik/src/slonik.ts#L32-L48
    title: hasDecorator idempotency guard
  - id: mailer-guard
    resource: repo://packages/mailer/src/plugin.ts#L97-L100
    title: Mailer throws on double registration
  - id: transport-name
    resource: repo://packages/graphql/src/uploads/transport.ts#L52-L55
    title: Named plugin
  - id: graphql-has-plugin
    resource: repo://packages/graphql/src/plugin.ts#L30-L40
    title: hasPlugin dedupe and parser snapshot comment
  - id: user-on-ready
    resource: repo://packages/user/src/plugin.ts#L23-L25
    title: onReady seeding
  - id: phone-on-ready
    resource: repo://packages/phone-auth/src/plugin.ts#L21-L28
    title: onReady migration
  - id: error-handler
    resource: repo://packages/error-handler/src/plugin.ts#L53
    title: setErrorHandler
  - id: st-error-handler
    resource: repo://packages/user/src/supertokens/plugin.ts#L17-L19
    title: Second setErrorHandler
  - id: claude-md
    resource: repo://CLAUDE.md
    title: Known Fastify 5 gotchas
  - id: fastify-docs
    resource: https://fastify.dev/docs/latest/Reference/Encapsulation/
    title: Fastify encapsulation reference (external)
---

# Fastify Encapsulation in This Repo

Fastify's encapsulation model is documented upstream.[^fastify-docs] These are the specific uses this codebase depends on. Fastify 5 is pinned at `>=5.10.0`; re-check this page after a major bump.

## Package plugins escape encapsulation; controllers do not
- Every package's `plugin.ts` exports `FastifyPlugin(plugin)`, the skip-override wrapper.[^slonik-plugin] Its decorators, hooks, parsers and error handler apply **app-wide**. That is why one registration of config or slonik serves every route, and why [registration order](../architecture/plugin-registration-order.md) matters.
- Route controllers are exported as **plain** async functions and registered with `{ prefix: routePrefix }`.[^firebase-controller][^firebase-plugin] An encapsulated child context is what makes the prefix apply to its routes only.
- History records a fix for plugins "being registered mixes async and callback styles".[^commit-async] Plugins are written as `async (fastify, options) => {}` with no `done` callback.

## App-wide value vs per-request value
The config and slonik plugins both decorate the instance and also assign the same object to each request in a root `onRequest` hook.[^config-plugin][^slonik-decorators] Handlers read `request.config`, `request.slonik` and `request.dbSchema`, never closure variables. That keeps handlers and services testable, and gives a consumer a per-request seam: `dbSchema` is decorated empty for exactly that purpose.

## Idempotency
- slonik checks `hasDecorator` and `hasRequestDecorator` before decorating, so a second registration is silently harmless.[^slonik-decorators]
- mailer **throws** on a second registration instead.[^mailer-guard]
- The graphql upload transport is a **named** plugin (`prefabs-graphql-upload-transport`).[^transport-name] The graphql plugin checks `fastify.hasPlugin(name)` before registering it, so a deprecated s3 wrapper that already registered it is not duplicated.[^graphql-has-plugin]

## Content-type parsers vs hooks (the upload trap)
Parsers are **snapshotted into a context when it is created**; hooks are bound at `ready()`. A root parser added after mercurius has registered never applies to `/graphql`, although a root hook added at the same time still runs.[^graphql-has-plugin][^claude-md] Related quirks:
- `hasContentTypeParser("*")` returns `false` even when a `*` parser exists.[^claude-md]
- A dedicated parser (`multipart/form-data`) beats the catch-all in any context that sees both.

See [GraphQL uploads return 415 or an empty body](../troubleshooting/graphql-uploads-415-or-empty-body.md).

## `onReady` for work that needs the whole app
Registration runs top to bottom, so a plugin cannot see anything registered after it. The user plugin seeds roles in `onReady`.[^user-on-ready] phone-auth runs its `users` migration and GraphQL schema extension in `onReady`, because it must register before user but depends on what user creates.[^phone-on-ready]

## One error handler per context
Both error-handler and user's SuperTokens sub-plugin call `setErrorHandler` on the root context.[^error-handler][^st-error-handler] Which one handles errors depends on configuration and order. See [Plugin registration order](../architecture/plugin-registration-order.md#two-root-error-handlers).

## Testing implications (from CLAUDE.md)
- Use real Fastify instances and `inject`.
- Asserting a mocked plugin was called must include `expect.any(Function)` as the third argument (`done`).
- Close each instance in `afterEach`.[^claude-md]

[^slonik-plugin]: `export default FastifyPlugin(plugin)`; every package plugin follows this pattern.
[^firebase-controller]: `const plugin = async (fastify) => {...}; export default plugin;`.
[^firebase-plugin]: `fastify.register(notificationRoutes, { prefix: routePrefix })`.
[^commit-async]: Commit b0a11405 touched plugin files in config, firebase, s3 and user.
[^config-plugin]: `fastify.decorate("config", config)` plus `onRequest` sets `request.config`.
[^slonik-decorators]: `if (!fastify.hasDecorator("slonik") && !fastify.hasDecorator("sql"))`.
[^mailer-guard]: `throw new Error("fastify-mailer has already been registered")`.
[^transport-name]: `name: UPLOAD_TRANSPORT_PLUGIN_NAME`.
[^graphql-has-plugin]: Comment: "so its catch-all content-type parser is snapshotted into the mercurius context".
[^user-on-ready]: `fastify.addHook("onReady", async () => { await seedRoles(user); })`.
[^phone-on-ready]: The comment explains the users table timing.
[^error-handler]: `fastify.setErrorHandler(async (error, request, reply) => {...})`.
[^st-error-handler]: `if (config.user.supertokens.setErrorHandler !== false) fastify.setErrorHandler(errorHandler)`.
[^claude-md]: "Known Fastify 5 gotchas" items 1, 2, 5; testing rules.
[^fastify-docs]: External; not ingested.
