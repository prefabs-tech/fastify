---
name: write-tests
description: Write unit tests for a Fastify plugin package. Uses FEATURES.md as the "what to test" guide and focuses on verifying custom code only. Use this skill when the user asks to write tests, add test coverage, or fix broken tests — e.g., "write tests for packages/auth", "test this plugin", "tests broke after dependency bump".
argument-hint: [package-path]
effort: medium
---

# Write Unit Tests for a Fastify Plugin Package

Write tests for the package at: `$ARGUMENTS`

If no path is provided, use the current working directory.

Read `.claude/skills/CONVENTIONS.md` now before writing any tests — especially the **Testing** and **Known Fastify 5 Gotchas** sections.

If you want to look at existing tests for reference, check the firebase package (`packages/firebase/src/__test__/`) or swagger package. Other package tests might not be standard.

---

## Prerequisites

Check for the required input files:

**`FEATURES.md` must exist.** If it does not:

> `FEATURES.md` not found in `$ARGUMENTS`. Run `/write-docs $ARGUMENTS` first to generate it, then re-run this skill.

Stop. Do not proceed without it.

**`ANALYSIS.md` is optional but useful.** If it exists, read it now — it gives you the full ours/theirs classification and passthrough analysis, which helps you identify what needs testing without re-reading all source files.

---

## Step 1: Understand What to Test

Read these files in the target package:

- `FEATURES.md` — this is your primary guide for what to test
- All `.ts` files in `src/` — to understand the implementation
- `package.json` — to identify dependencies (base libraries we wrap)

**How many tests to write:** Aim for one test per conditional branch (if/else, enable/disable flag) and one test per decorator. For option passthrough, one test per dependency is enough to verify wiring. This typically results in 5–20 tests per package — don't over-test.

For each feature, decide if it needs a test:

| Code pattern                        | Test?         | Why                                              |
| ----------------------------------- | ------------- | ------------------------------------------------ |
| Conditional logic (if/else)         | YES           | Every branch we wrote needs coverage             |
| Default values we set               | YES           | Verify the defaults are what we documented       |
| Decorators we add                   | YES           | Verify they exist and have correct values        |
| Options passthrough to base library | YES, one test | Verify the wiring works (not the library itself) |
| Type definitions                    | NO            | Types are compile-time only                      |
| Direct re-exports                   | NO            | Nothing to break                                 |
| fastify-plugin wrapping             | NO            | That's their code                                |

---

## Step 2: Write Tests

### File location

Create test files at `src/__test__/plugin.test.ts` (or appropriate names matching what is being tested). Multiple files are fine if it improves organization.

If `src/__test__/` does not exist, create it.

### Pattern for every test

```typescript
import { describe, it, expect, afterEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import plugin from "../plugin"; // adjust import path

describe("plugin name", () => {
  let fastify: FastifyInstance;

  afterEach(async () => {
    await fastify.close();
  });

  it("description of behavior", async () => {
    fastify = Fastify();
    await fastify.register(plugin, {
      /* options */
    });
    await fastify.ready();
    // assertions here
  });
});
```

### Rules

- **Use real Fastify instances. Do NOT mock Fastify.**
- **Do NOT mock base-library plugins.** Mock only our own modules.
- **Always close Fastify instances in `afterEach`.**
- **Name tests by behavior**, not implementation.

### Assertions for common patterns

**Decorator exists with value:**

```typescript
expect(fastify.decoratorName).toBe("expected value");
```

**Decorator does NOT exist (plugin disabled/skipped):**

```typescript
expect(fastify.decoratorName).toBeUndefined();
```

**Plugin wiring works (base library received our config):**
Use a lightweight integration check — call a method the base library provides and verify it reflects our config.

**Route was registered:**

```typescript
const response = await fastify.inject({
  method: "GET",
  url: "/expected-route",
});
expect(response.statusCode).toBe(200);
```

### What NOT to test

- That base libraries generate correct output for various inputs
- TypeScript types at runtime
- `fastify-plugin` wrapping behavior
- Behavior with invalid inputs that TypeScript prevents
- Third-party library config options work — only test we pass them through
- Do not aim for 100% coverage — aim for testing every code path WE wrote

---

## Step 3: Run and Fix

1. Run `pnpm test` from the package directory to execute the tests
2. If tests fail, read the error carefully and fix the test or assertion
3. Do not change source code to make tests pass — tests verify existing behavior
4. All tests must pass before you are done

### Common failure patterns

- **"Cannot find module" or import errors** — check the import path. Use `../plugin` not `../src/plugin`. Check `package.json` exports if importing by package name.
- **Plugin registration throws** (e.g., missing env var, DB connection) — mock the specific setup function that needs external resources using `vi.mock()`. Do NOT mock Fastify or the base library plugin.
- **Timeout on `fastify.ready()`** — a plugin is waiting for something async that never resolves. Check if the plugin requires a database connection or external service and mock that dependency.
- **"already registered" errors** — create a fresh Fastify instance in each test, not shared across tests. The `afterEach` cleanup pattern in Step 2 handles this.

---

## Output Summary

When done, print:

- Number of tests written
- Test results (pass/fail)
- Any concerns found (options silently dropped, missing passthrough, etc.)
