---
type: Troubleshooting
title: SuperTokens Is Already Initialised
description: Boot fails with "SuperTokens is already initialised. Register SuperTokens recipe plugins before @prefabs.tech/fastify-user." because a recipe plugin was registered after the user plugin.
tags: [troubleshooting, supertokens, phone-auth, registration-order]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: registry
    resource: repo://packages/user/src/supertokens/recipeRegistry.ts#L5-L24
    title: addSupertokensRecipe
  - id: st-init
    resource: repo://packages/user/src/supertokens/init.ts#L10-L24
    title: init decorates supertokensInitialized
  - id: recipes
    resource: repo://packages/user/src/supertokens/recipes/index.ts#L20-L24
    title: Registry drained into the recipe list
  - id: phone-test
    resource: repo://packages/phone-auth/src/__test__/plugin.test.ts#L92-L99
    title: Test for the ordering error
  - id: phone-guide
    resource: repo://packages/phone-auth/GUIDE.md#L25-L42
    title: Phone auth GUIDE, registration order
  - id: user-guide
    resource: repo://packages/user/GUIDE.md#L253-L279
    title: User GUIDE, contributing a recipe
---

# SuperTokens Is Already Initialised

## Symptom
Registration throws:
```
Error: SuperTokens is already initialised. Register SuperTokens recipe plugins
before @prefabs.tech/fastify-user.
```

## Cause
- `supertokens.init()` can run only once per process. The user plugin calls it synchronously while it registers, then decorates `supertokensInitialized`.[^st-init]
- The recipe list is built at that moment: user's own recipes, plus every factory already pushed onto `fastify.supertokensRecipes`.[^recipes]
- A plugin that calls `addSupertokensRecipe`, such as [phone-auth](../components/phone-auth.md), after that point would be ignored. The registry throws instead of dropping the recipe silently.[^registry]

## Fix
Register recipe plugins **before** the user plugin:[^phone-guide]
```ts
await fastify.register(configPlugin, { config });
await fastify.register(slonikPlugin, config.slonik);
await fastify.register(phoneAuthPlugin);   // pushes the recipe factory
await fastify.register(userPlugin);        // supertokens.init() drains it
```
A recipe plugin that also needs tables or GraphQL types created by user must defer that work to `onReady`, as phone-auth does. See [Plugin registration order](../architecture/plugin-registration-order.md#work-deferred-to-onready).

## Verified by
`phone-auth/src/__test__/plugin.test.ts`: "throws when registered after SuperTokens has already been initialised".[^phone-test] The user GUIDE documents the registry contract.[^user-guide]

[^st-init]: `supertokens.init({...})`, then `fastify.decorate("supertokensInitialized", true)`.
[^recipes]: `for (const factory of registeredRecipes) recipeList.push(factory(fastify))`.
[^registry]: The comment on L5-8 explains the single-init constraint.
[^phone-guide]: "Registration order — read this first".
[^phone-test]: The test decorates `supertokensInitialized` first, then expects the throw.
[^user-guide]: "Contributing a SuperTokens recipe from another plugin".
