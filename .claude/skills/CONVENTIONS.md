# Shared Conventions

Rules that apply across all skills. Each SKILL.md references this file instead of repeating these.

---

## Scope

- **Stay inside the target package directory.** Do not read files outside of it unless explicitly told to.
- **Do not invent features.** Only document or test what source code confirms exists.

## Code Examples

- Use **TypeScript** in all code examples.
- Keep examples minimal — just enough to show the point, no boilerplate.

## Testing

- **Use real Fastify instances. Do NOT mock Fastify.** Plugins are side-effect functions — mocking the instance means testing nothing.
- **Do NOT mock base-library plugins** (e.g., `@fastify/swagger`, `@fastify/multipart`). The point of the integration layer tests is to catch breakage from dependency upgrades. Mock only our own modules (migrations, sub-plugins we authored).
- **Always close Fastify instances in `afterEach`** to avoid resource leaks.
- **Use Vitest** (`import from "vitest"`). The project already has it configured.
- **Test what WE wrote, not what third-party libraries do.** Ask: "Does this verify code our team wrote, or that a third-party library works?"
- **Name tests by behavior**, not implementation. GOOD: `"decorates instance with default documentation path"` BAD: `"line 23 sets routePrefix"`

### Known Fastify 5 Gotchas

These patterns have been validated in this monorepo. Follow them to avoid known pitfalls:

1. **`hasContentTypeParser("*")` returns false** even when a `*` catch-all parser is registered in Fastify 5. Use a behavioural test instead: inject a request with an unusual content-type and assert the status is not 415.
2. **Asserting `vi.fn()` plugin calls**: always include `expect.any(Function)` as the third argument — Fastify calls plugins as `plugin(fastify, options, done)`.
3. **`Readable.from(["string"])` emits strings, not Buffers.** `Buffer.concat` will throw. Use `Readable.from([Buffer.from("string")])` instead.
4. **Verify `@fastify/multipart`** with `fastify.hasContentTypeParser("multipart/form-data")`, not `getSchema("fileSchema")` — `sharedSchemaId` does not expose a schema via `fastify.getSchema`.

## Base Library Documentation

- **Do not repeat base library documentation in detail.** Link to their docs.
- **For doc links:** use the library's official docs URL. If unsure, use the npm page: `https://www.npmjs.com/package/{package-name}`.
- **List only the delta** for partial/modified passthroughs — what we change, not what we preserve.

## Reference Packages

- `packages/firebase` — has FEATURES.md and comprehensive tests
- `packages/config` — has GUIDE.md as the format reference
