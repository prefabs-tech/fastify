# SPEC: `ApiConfig` after plugin-config decoupling

**Date:** 2026-07-12
**Status:** Draft
**Related:** [ADR-CONFIG.md](./ADR-CONFIG.md) (runtime validation & schema composition — this spec covers the *type layer* of the same decision), per-plugin `fastify.config` fallback deprecations (e.g. `@prefabs.tech/fastify-s3`).

---

## Problem

Every plugin package is moving to explicit options: it defines its own config type (`S3Config`, `GraphqlConfig`, …) and receives it directly at registration:

```ts
await fastify.register(s3Plugin, config.s3);
```

The per-plugin module augmentations of `ApiConfig` (e.g. `declare module "@prefabs.tech/fastify-config" { interface ApiConfig { s3: S3Config } }`) exist only to support the deprecated `fastify.config` fallback and are scheduled for removal.

Apps still want a **central, fully-typed config object**. Once the augmentations are gone, something must give `config.s3` its type. Putting `s3: S3Config` (and `graphql: …`, etc.) into `ApiConfig` inside this package would make `@prefabs.tech/fastify-config` depend on every plugin package — inverting the dependency graph and recreating the monolithic type this migration removes (ADR-CONFIG Option 1, rejected).

## Design principles

1. **Dependency direction.** `@prefabs.tech/fastify-config` depends on no plugin package. Plugin packages do not depend on `@prefabs.tech/fastify-config` for their configuration. The **application** — which already depends on every plugin it registers — is the only place that knows the full config shape.
2. **Composition over augmentation.** The central config type is composed explicitly in app code, not assembled implicitly by global `declare module` side effects whose result depends on which imports happen to be in scope.
3. **Explicit plugin inventory is a feature.** One line per plugin in the app's config type documents exactly which plugins the app uses.

## Specification

### 1. `ApiConfig` contains base keys only

After the augmentation removals, `ApiConfig` in this package is exactly the base application shape currently in `src/types.ts` (`appName`, `appOrigin`, `apps`, `baseUrl`, `env`, `logger`, `name`, `pagination`, `port`, `protocol`, `rest`, `version`). No plugin keys, ever.

### 2. Plugin packages export their config types; no augmentation

Each plugin package exports its configuration contract (e.g. `S3Config` / `S3Options`) from its own root and ships **no** `declare module "@prefabs.tech/fastify-config"` block. Until removal, existing augmentations are marked `@deprecated` on the property (see `fastify-s3` `index.ts` for the pattern).

### 3. The app composes its config type (normative pattern)

```ts
// app config module (one file per app, next to where config is built)
import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { GraphqlConfig } from "@prefabs.tech/fastify-graphql";
import type { S3Config } from "@prefabs.tech/fastify-s3";

export interface AppConfig extends ApiConfig {
  graphql: GraphqlConfig;
  s3: S3Config;
  // …one line per registered plugin, plus app-domain keys (booking, redis, …)
}
```

`fastify.register(s3Plugin, config.s3)` type-checks because `config: AppConfig`. All dependency arrows point the right way and the graph is acyclic.

### 4. Optional sugar: generic `ApiConfig` (this package MAY provide)

```ts
// in @prefabs.tech/fastify-config — still zero plugin dependencies
export type ApiConfig<TPlugins = unknown> = BaseConfig & TPlugins;

// in the app
type AppConfig = ApiConfig<{ graphql: GraphqlConfig; s3: S3Config }>;
```

The default type parameter keeps bare `ApiConfig` valid, so this is a non-breaking addition. Functionally identical to §3; apps pick one style.

### 5. Optional: preset package for shared stacks

If several apps share one plugin lineup, the "depends on everything" fan-in may be contained in one deliberate leaf package (e.g. `@prefabs.tech/fastify-preset`) that depends on all plugin packages and exports the composed config type (and optionally a register-all helper). This keeps the fan-in a documented choice in one place — never in this package. Only justified when duplication across apps is real.

### 6. Transitional only: opt-in augmentation subpath

As a migration bridge, a plugin MAY move its augmentation to a side-effect subpath export (`import "@prefabs.tech/fastify-s3/augment"`), so apps opt in explicitly instead of receiving it from any import of the package. This preserves global-interface magic and is **not** the destination; prefer §3.

### 7. `fastify.config` decoration

Plugins no longer read `fastify.config` (fallback deprecated). Consequently:

- Apps that still want a typed `fastify.config` decoration add one `declare module "fastify"` block **in app code**, typing it as their `AppConfig` — acceptable, because it is app code typing an app decision.
- Apps SHOULD consider not decorating plugin config onto fastify at all and passing the config module around as a plain import — simpler, and nothing in the plugin layer requires the decoration.

## Rejected alternatives

- **Plugin keys in this package's `ApiConfig`** — makes `@prefabs.tech/fastify-config` depend on every plugin; monolithic, unbounded growth (ADR-CONFIG Option 1).
- **Keeping per-plugin global augmentation as the long-term mechanism** — config shape becomes import-order magic, scattered and non-discoverable (ADR-CONFIG Option 2, currently in use, being retired).

## Relationship to ADR-CONFIG Option 3 (schema composition)

This spec is the type-layer half of the ADR's recommendation: packages own their config contracts, the app composes them in one file. When Zod schemas are adopted per the ADR, the app-level `AppConfig` interface of §3 can be replaced by `z.infer<typeof appConfigSchema>` composed from package-exported schema fragments — same dependency direction, with runtime validation added. §3 works today without new dependencies and migrates cleanly to that end state.

## Migration

1. *(done / in progress)* Plugin packages accept explicit options; `fastify.config` fallbacks and `ApiConfig` augmentations marked `@deprecated` in docs and code.
2. Apps define `AppConfig` (§3) and pass config slices explicitly to `register()`.
3. Plugin releases remove the fallbacks and augmentations (breaking, announced).
4. Optionally: this package adds the generic parameter (§4); apps adopt schema composition per ADR-CONFIG.
