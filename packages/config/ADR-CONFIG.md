# ADR: Application Configuration Architecture

**Date:** 2026-04-02  
**Status:** Proposed  
**Decision Makers:** Engineering Team  
**Affected Components:** `@prefabs.tech/fastify-config`, app-level configuration

---

## Problem Statement

Our multi-package Fastify application requires a configuration system that:

1. **Supports extensibility** — Core packages (config, logger, mailer, firebase, etc.) need config, but the app layer may add domain-specific config (booking, event, redis, user profile exports) that packages can't know about beforehand
2. **Maintains type safety** — TypeScript should catch config shape mismatches at compile time
3. **Enables runtime validation** — Invalid or missing config should fail fast at startup, not at 3am in production
4. **Minimizes coupling** — The @config package shouldn't need to know about every package that needs configuration
5. **Remains maintainable** — Configuration architecture should be clear, with tradeoffs documented

Current pain points:

- `ApiConfig` type is centralized in `@config` but needs to be extended by the app for custom fields
- Config is constructed from environment variables without schema validation
- App-level config augmentation is scattered via TypeScript module declarations
- If a required env var is missing, the error appears at runtime, not at startup

---

## Options Considered

### Option 1: Centralized ApiConfig (Current Baseline)

**How it works:**

- All config fields defined in `ApiConfig` interface within `@config` package
- `@config` package "knows about" all packages and app-level needs
- Single point of truth for type definition
- Config decorator on fastify instance and request

```ts
// @config/types.ts
export interface ApiConfig {
  appName: string;
  firebase: FirebaseConfig;
  logger: LoggerConfig;
  mailer: MailerConfig;

  // ... 20 more packages
  booking: {
    /* app-level */
  };
  event: {
    /* app-level */
  };
  redis: {
    /* app-level */
  };
  // ... custom app fields
}
```

**Tradeoffs:**

| Aspect              | Rating               | Notes                                                    |
| ------------------- | -------------------- | -------------------------------------------------------- |
| **Extensibility**   | ⭐ Poor              | Every new config field requires changing @config package |
| **Type Safety**     | ⭐⭐⭐⭐⭐ Excellent | Single source of truth, all fields typed                 |
| **Validation**      | ⭐⭐ Poor            | Manual object construction, no schema validation         |
| **Coupling**        | ⭐⭐ High            | @config must know about all packages and app needs       |
| **Maintainability** | ⭐⭐ Poor            | ApiConfig grows unbounded; becomes a monolithic type     |
| **Discoverability** | ⭐⭐⭐ Moderate      | Need to look in one file, but it becomes huge            |

**When to use:** Small, stable applications with a fixed set of known config fields.

---

### Option 2: Module Augmentation at App Level (Currently In Use)

**How it works:**

- Base `ApiConfig` defined in `@config` with core fields only
- App level extends ApiConfig via TypeScript module declaration
- Each package can also have its config interface extended at app level
- Config object constructed manually from env vars at app startup

```ts
// @config/types.ts (minimal)
export interface ApiConfig {
  appName: string;
  env: string;
  port: number;
}

// app/config.ts (app level augmentation)
declare module "@prefabs.tech/fastify-config" {
  interface ApiConfig {
    booking: {
      /* ... */
    };
    event: {
      /* ... */
    };
    redis: {
      /* ... */
    };
  }
}

declare module "@prefabs.tech/fastify-mailer" {
  interface MailerConfig {
    bccTo?: string;
    queueName: string;
  }
}

const config: ApiConfig = {
  appName: process.env.APP_NAME as string,
  booking: {
    /* manually constructed */
  },
  // ...
};
```

**Tradeoffs:**

| Aspect              | Rating          | Notes                                                          |
| ------------------- | --------------- | -------------------------------------------------------------- |
| **Extensibility**   | ⭐⭐⭐⭐ Good   | App can add fields without touching packages                   |
| **Type Safety**     | ⭐⭐⭐⭐ Good   | TypeScript augmentation provides compile-time checks           |
| **Validation**      | ⭐ Poor         | No schema validation; relies on type casting (`as string`)     |
| **Coupling**        | ⭐⭐⭐ Moderate | @config minimal, but app must know about all packages          |
| **Maintainability** | ⭐⭐⭐ Moderate | Module declarations can be hard to track; spread across files  |
| **Discoverability** | ⭐⭐ Poor       | Config shape scattered across multiple `declare module` blocks |

**When to use:** Multi-package systems where the app layer has significant custom config, and type safety is more important than runtime validation.

**Current Status:** This is what the codebase currently implements.

**Known Issues:**

- Missing env vars return `undefined`, not caught until runtime
- No schema validation at startup
- If you do `config.appName.toLowerCase()` and `APP_NAME` env var is missing, crash at runtime

---

### Option 3: Plugin-Driven Schema Composition (Recommended)

**How it works:**

- Each package exports a schema fragment for its config section
- App composes all schemas at startup (one place, one file)
- Zod (or similar) validates the entire config structure before decoration
- Single point of truth shifts from type definitions to schema + composition
- Runtime validation catches errors at startup, not in production

```ts
// @config/validator.ts
export const coreConfigSchema = z.object({
  appName: z.string().min(1),
  env: z.enum(["dev", "test", "prod"]),
  port: z.number().positive(),
})

// @logger/config.ts
export const loggerConfigSchema = z.object({
  level: z.string(),
  rotation: z.object({...}).optional(),
})

// @mailer/config.ts
export const mailerConfigSchema = z.object({
  host: z.string(),
  port: z.number().positive(),
})

// app/config.ts - single composition point
import { coreConfigSchema } from "@config"
import { loggerConfigSchema } from "@logger"
import { mailerConfigSchema } from "@mailer"

const appConfigSchema = z.object({
  ...coreConfigSchema.shape,
  booking: z.object({...}),
  event: z.object({...}),
  logger: loggerConfigSchema.optional(),
  mailer: mailerConfigSchema.optional(),
  redis: z.object({...}),
})

// Validate at startup
const config = appConfigSchema.parse({
  appName: process.env.APP_NAME,
  port: parseInt(process.env.PORT || "3000"),
  // ...
})
```

**Tradeoffs:**

| Aspect              | Rating               | Notes                                                            |
| ------------------- | -------------------- | ---------------------------------------------------------------- |
| **Extensibility**   | ⭐⭐⭐⭐⭐ Excellent | Add new config = add new schema fragment, no touching other code |
| **Type Safety**     | ⭐⭐⭐⭐⭐ Excellent | Schemas infer types; TypeScript knows full shape via `z.infer<>` |
| **Validation**      | ⭐⭐⭐⭐⭐ Excellent | Runtime schema validation at startup; fail fast                  |
| **Coupling**        | ⭐⭐⭐⭐ Good        | Packages export schemas; app composes them; minimal coupling     |
| **Maintainability** | ⭐⭐⭐⭐ Good        | One composition file; schemas live with packages; easy to track  |
| **Discoverability** | ⭐⭐⭐⭐ Good        | Config shape visible in app-level schema composition             |

**When to use:** Growing multi-package systems, microservices architectures, or any application where config extensibility and runtime safety are important.

**Advantages:**

- **Fail-fast guarantee** — Missing or invalid env vars error at startup
- **Single composition point** — All config decisions visible in one file
- **Clear ownership** — Each package owns its schema
- **Type + validation together** — Zod generates types from schema, no duplication
- **Testable** — Schemas can be unit-tested independently

**Disadvantages:**

- Requires adding Zod (or similar) dependency
- Slightly more setup initially
- Need to maintain both schema + values in construction

---

### Option 4: Loose Config with Per-Package Validation (Not Recommended)

**How it works:**

- Minimal central config structure
- Each package validates its own config section at plugin registration time
- No central schema; validation scattered

```ts
// @config - minimal
export const baseConfig = { appName, port, env };

// @logger - validates its own section
export const validateLoggerConfig = (cfg) => loggerConfigSchema.parse(cfg);

fastify.register(loggerPlugin, { config: fullConfig });
// loggerPlugin internally extracts and validates config.logger
```

**Tradeoffs:**

| Aspect              | Rating               | Notes                                                  |
| ------------------- | -------------------- | ------------------------------------------------------ |
| **Extensibility**   | ⭐⭐⭐⭐ Good        | Packages are decoupled from central config             |
| **Type Safety**     | ⭐⭐ Poor            | Per-package validation, no centralized type            |
| **Validation**      | ⭐⭐⭐ Moderate      | Validation happens at plugin registration, not startup |
| **Coupling**        | ⭐⭐⭐⭐⭐ Excellent | Maximum decoupling; packages validate independently    |
| **Maintainability** | ⭐⭐ Poor            | Validation logic scattered across packages             |
| **Discoverability** | ⭐ Very Poor         | Config shape is invisible until plugins register       |

**When to use:** Very loosely-coupled systems or if you want each package to be independently reusable.

**Not recommended because:** Errors discovered late (at plugin registration time, not startup), config shape opaque.

---

## Comparison Matrix

| Criterion       | Option 1: Centralized | Option 2: App Augmentation | Option 3: Schema Composition | Option 4: Per-Package |
| --------------- | --------------------- | -------------------------- | ---------------------------- | --------------------- |
| Fail-fast       | ❌ No                 | ❌ No                      | ✅ Yes                       | ⚠️ Late               |
| Type Safety     | ✅ Good               | ✅ Good                    | ✅ Excellent                 | ❌ Weak               |
| Extensibility   | ❌ Poor               | ✅ Good                    | ✅ Excellent                 | ✅ Good               |
| Coupling        | ❌ High               | ⚠️ Moderate                | ✅ Low                       | ✅ Very Low           |
| Simplicity      | ✅ Simple             | ✅ Simple                  | ⚠️ Moderate                  | ⚠️ Moderate           |
| Discoverability | ⚠️ Moderate           | ❌ Poor                    | ✅ Good                      | ❌ Poor               |
| Maintenance     | ❌ Monolithic         | ⚠️ Scattered               | ✅ Centralized               | ❌ Scattered          |

---

## Recommendation: Option 3 (Plugin-Driven Schema Composition)

**Why this option:**

1. **Fail-fast guarantee** — The most critical issue with current setup (Option 2) is that missing env vars aren't caught until they're accessed. Schema validation at startup solves this.

2. **Clear composition point** — One file shows the entire config shape. Easy to onboard new team members.

3. **Package ownership** — Each package owns its schema fragment. Encourages good package design.

4. **Type safety** — Zod infers types from schemas, so you get `z.infer<typeof appConfigSchema>` with full type safety, no manual interface management.

5. **Scalability** — As you add more packages (redis, elasticsearch, queue systems, etc.), composition scales naturally.

**Migration Path from Option 2 (current) → Option 3:**

```
Phase 1: Add validation without refactoring
  - Keep current module augmentation
  - Add Zod schema that mirrors current ApiConfig structure
  - Validate at startup

Phase 2: Extract package schemas
  - Move logger schema from app to @logger package
  - Move mailer schema from app to @mailer package
  - Compose in app/config.ts

Phase 3: Clean up
  - Remove manual interface extensions (module augmentations)
  - Let Zod infer types via z.infer<>
  - Update tests
```

---

## Implementation Plan

### If adopting Option 3:

1. **Add dependency:** `npm install zod` (or pnpm in this monorepo)

2. **Refactor @config package:**

   ```ts
   // @config/validator.ts (new)
   export const coreConfigSchema = z.object({
     appName: z.string().min(1),
     appOrigin: z.array(z.string()),
     baseUrl: z.string(),
     env: z.enum(["dev", "test", "prod"]),
     logger: z
       .object({
         level: z.string(),
         // ... nested fields
       })
       .optional(),
     port: z.number().positive(),
     protocol: z.string(),
     rest: z.object({ enabled: z.boolean() }),
     version: z.string(),
   });
   ```

3. **Each package exports schema:**

   ```ts
   // @mailer/config.ts
   export const mailerConfigSchema = z.object({
     bccTo: z.string().optional(),
     host: z.string(),
     port: z.number().positive(),
     queueName: z.string(),
   });
   ```

4. **App composes at startup:**

   ```ts
   // app/config.ts
   import { coreConfigSchema } from "@config"
   import { mailerConfigSchema } from "@mailer"

   const appConfigSchema = z.object({
     ...coreConfigSchema.shape,
     booking: z.object({...}),
     mailer: mailerConfigSchema.optional(),
     // ... app-specific
   })

   export const config = appConfigSchema.parse({
     appName: process.env.APP_NAME,
     // ... construct from env
   })
   ```

5. **Update fastify decorations:**
   ```ts
   // @config/index.ts
   declare module "fastify" {
     interface FastifyInstance {
       config: z.infer<typeof appConfigSchema>; // Inferred from app schema
     }
   }
   ```

---

## Consequences

### Positive

- ✅ **Fail-fast** — Invalid config caught at startup, not in production
- ✅ **Type-safe** — Full TypeScript coverage of config shape
- ✅ **Extensible** — Adding new config sections doesn't require changes to @config
- ✅ **Maintainable** — One clear composition point for all config
- ✅ **Testable** — Schemas can be unit-tested in isolation

### Negative

- ⚠️ **New dependency** — Adds Zod to the stack (but it's standard practice)
- ⚠️ **Slightly more boilerplate** — Schema definitions alongside construction
- ⚠️ **Learning curve** — Team needs to understand schema composition

### Neutral

- 🔹 **Migration effort** — Requires refactoring existing config code, but manageable
- 🔹 **Slight performance** — Schema validation at startup (negligible, runs once)

---

## Decision

**Adopt Option 3: Plugin-Driven Schema Composition**

**Rationale:**

- Solves the critical validation gap in the current approach (Option 2)
- Provides the scalability needed for a growing, multi-package application
- Aligns with Node.js best practices for configuration management
- Minimal risk, clear migration path from current state

---

## References

- Zod Documentation: https://zod.dev
- 12 Factor App - Config: https://12factor.net/config
- Node.js Best Practices - Configuration: https://github.com/goldbergyoni/nodebestpractices#6-configuration
