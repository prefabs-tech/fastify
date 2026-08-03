# Spec: Extract passwordless login into `@prefabs.tech/fastify-passwordless`

Status: implemented on branch `feat/passwordless-verify-service` (2026-07-27).

> Historical record. The package was later renamed to
> `@prefabs.tech/fastify-phone-auth` (`packages/phone-auth`) and its config
> namespace from `config.passwordless` to `config.phoneAuth`. Names below are
> as they were at the time of writing.

## 1. Problem statement

Passwordless login (phone/SMS OTP via Twilio Verify) was built inside
`packages/user` with three disjoint config surfaces —
`user.features.passwordlessLogin.enabled`, `user.passwordLessConfig`, and
`user.supertokens.recipes.passwordless` — and pulled `twilio` into the runtime
`dependencies` of the auth package that every consumer installs. It is an
opt-in feature that a minority of apps use.

## 2. The constraint that shapes the design

**SuperTokens permits exactly one global `supertokens.init()`.**
`packages/user/src/supertokens/init.ts` calls it synchronously during plugin
registration, with `recipeList: getRecipeList(fastify)` fixed at that moment. A
plugin registered *after* `fastify-user` therefore cannot contribute a recipe —
there is no post-init recipe API.

Two mechanisms were considered:

1. **Registry + register-before-user (chosen).** `fastify-user` keeps `init()`
   where it is. Recipe packages push a factory into a `fastify.supertokensRecipes`
   decorator that `getRecipeList` drains. Wrong order throws.
2. **Registry + defer `init()` to `onReady`.** Order-independent. Rejected: it
   changes init timing for every already-published `fastify-user` consumer, and
   any consumer calling a SuperTokens API between `register` and `ready` would
   break.

Worth recording for whoever revisits option 2: it *is* technically viable.
`supertokens-node@14.1.4`'s Fastify plugin resolves the singleton only inside a
`preHandler` (`lib/build/framework/fastify/framework.js:199-212`), not at
registration time. `seedRoles` is already an `onReady` hook added after
`register(supertokensPlugin)`, so an init-in-`onReady` added earlier would still
sequence correctly. The blocker is consumer compatibility, not the SDK.

## 3. Target design

```typescript
// packages/user — new public API
addSupertokensRecipe(fastify, (fastify) => RecipeListFunction): void
```

- Throws when `fastify.hasDecorator("supertokensInitialized")` — i.e. when
  called after `fastify-user` registered — with a message naming the fix.
- Lazily creates the `supertokensRecipes` decorator, so no ordering requirement
  between multiple recipe packages.
- `init.ts` sets `supertokensInitialized` after `supertokens.init(...)`.
- Both plugins are `fastify-plugin`-wrapped, so decorators land on the same root
  instance and encapsulation never enters the picture.

Consumer order:

```typescript
await fastify.register(passwordlessPlugin); // pushes the recipe factory
await fastify.register(userPlugin);         // init() drains the registry
```

The new package collapses the three config surfaces into one
`config.passwordless` namespace and owns `twilio`.

## 4. Why this was safe to do non-additively

All passwordless code was branch-local. Verified before designing:

```bash
git show main:packages/user/src/types/config.ts | grep -i twilio        # no match
git show main:packages/user/src/supertokens/types/index.ts | grep -i passwordless
git grep -il passwordless main -- packages/                             # empty
```

Nothing was published, so removing `passwordLessConfig`,
`features.passwordlessLogin`, `TwilioConfig` and `SupertokensRecipes.passwordless`
from `UserConfig` is additive from an npm consumer's point of view and did not
trip CLAUDE.md escalation item 1. **Run this check before any "clean removal"
claim** — it is the difference between a refactor and a breaking change.

## 5. Bug found and fixed in passing

Passwordless signup was broken at runtime. `consumeCode` inserted `phoneNumber`,
`DefaultSqlFactory` decamelized it to a `phone_number` column that did not
exist, and an `as UserCreateInput` cast was what let it compile. Fixed in
`packages/user` (it owns the users table):

- `phoneNumber?: string` on `User`, omitted from `UserUpdateInput`;
- `phoneNumber` added to the **runtime** denylist in `filterUserUpdateInput` —
  the `Omit` in the type is not enforcement, and every other immutable field is
  on that list;
- additive idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS phone_number`,
  mirroring the existing `addProfileInUsersTableQuery`;
- the cast deleted.

**Rule extracted:** an `as SomeInput` cast on a `BaseService.create` argument is
a smell, not a convenience — `getCreateSql` decamelizes *every* key into a
column name, so the cast converts a compile error into a runtime
undefined-column error.

`UserSqlFactory` inherits `_validationSchema = z.any()` from `DefaultSqlFactory`,
so no zod schema needed widening. Check this before assuming a new column needs
a schema change.

## 6. Gotchas paid for during implementation

1. **Vite `external` does not match subpaths.** `Object.keys(peerDependencies)`
   externalizes the bare specifier only, so `supertokens-node/recipe/passwordless`
   was bundled: the first passwordless build was **1.1 MB** and transformed 302
   modules. `packages/user/vite.config.ts` already carried the fix —
   `/supertokens-node+/` in the `external` array. Adding it dropped the bundle to
   6 kB / 9 modules. Any new package importing `supertokens-node` subpaths needs
   that regex. A suspiciously large `dist/` is the symptom.

2. **`expect(mockFn).toHaveBeenCalledWith(fastifyInstance)` throws.** Vitest
   deep-equals the argument, which touches Fastify getters that fail before the
   server is listening (`TypeError: Cannot read properties of undefined (reading
   'family')`, `fastify.js:296`). Use an identity check on
   `mockFn.mock.calls[0][0]` instead.

3. **`supertokens.init()` is a process-global singleton, so tests must not go
   through `register(userPlugin)` twice.** The second registration throws
   "already initialised", which makes an ordering test pass for the wrong
   reason. Test `addSupertokensRecipe` and `getRecipeList` directly against a
   real-but-unregistered Fastify instance decorated with `config`, and stub the
   individual recipe inits.

4. **`pnpm -r install` aborts with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`**
   in a non-interactive shell when the workspace layout changed. `CI=true` plus
   `--no-frozen-lockfile` is the fix for the run that introduces a new package.

5. **`unicorn/no-unreadable-for-of-expression`** rejects
   `for (const x of a ?? [])`. Hoist the fallback into a `const` first.

## 7. Not verified

An end-to-end dev-mode signup against a live SuperTokens core was not run —
there is no consumer app in this repo. What *was* verified for the
`phone_number` fix: the rendered migration SQL (default and overridden table
name), its idempotency under `pg-mem` across two applications, and the removal
of the cast under `tsc`.
