<!-- Structured feature inventory — used by automated test generation. Developer docs: see GUIDE.md -->

## Plugin Registration

1. Registers as a Fastify plugin via `fastify-plugin` (no encapsulation — decorators are visible across the full app).
2. Accepts a single required option: `{ config: ApiConfig }`.
3. Provides no internal defaults for plugin options — callers must provide a complete `ApiConfig` object.

## Fastify Decorators

4. Decorates `FastifyInstance` with `config` (the full `ApiConfig` object).
5. Decorates `FastifyInstance` with `hostname` (derived as `${config.baseUrl}:${config.port}`).

## Fastify Hooks

6. Registers an `onRequest` hook that sets `request.config` to the same `ApiConfig` object on every incoming request.

## Utility Functions

7. Exports a `parse` utility for converting raw `string | undefined` env var values to typed values using a fallback to infer the target type:
   - Returns `fallback` when `value` is `undefined`.
   - Returns a `boolean` (via `!!JSON.parse(value)`) when `fallback` is a `boolean`.
   - Returns a `number` (via `JSON.parse(value)`) when `fallback` is a `number`.
   - Returns the raw `string` otherwise.

   ```typescript
   parse(process.env.PORT, 3000); // → number
   parse(process.env.DEBUG, false); // → boolean
   parse(process.env.APP_NAME, "my-app"); // → string
   parse(undefined, 3000); // → 3000 (fallback)
   ```

## Type Exports & Module Augmentation

8. Exports `ApiConfig` type — the shape of the full application configuration object.
9. Exports `AppConfig` type — the shape of an individual app entry within `ApiConfig.apps`.
10. Module-augments `FastifyInstance` to add `config: ApiConfig` and `hostname: string`.
11. Module-augments `FastifyRequest` to add `config: ApiConfig`.

## ApiConfig Shape

12. `ApiConfig` top-level fields:
    - `appName: string`
    - `appOrigin: string[]`
    - `apps?: AppConfig[]`
    - `baseUrl: string`
    - `env: string`
    - `logger` — see feature 12
    - `name: string`
    - `pagination?: { default_limit: number; max_limit: number }`
    - `port: number`
    - `protocol: string`
    - `rest: { enabled: boolean }`
    - `version: string`

13. `ApiConfig.logger` sub-object:
    - `level: Level` (required)
    - `base?: LoggerOptions["base"]`
    - `formatters?: LoggerOptions["formatters"]`
    - `prettyPrint?: { options: { colorize: boolean; ignore: string; translateTime: string } }`
    - `rotation?: { enabled: boolean; options: { filenames: string[]; path: string; interval?: string; size?: string; maxFiles?: number; maxSize?: string; compress?: boolean | Compressor | string } }`
    - `streams?: (DestinationStream | StreamEntry)[]`
    - `timestamp?: LoggerOptions["timestamp"]`
    - `transport?: LoggerOptions["transport"]`
