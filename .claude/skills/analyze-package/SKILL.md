---
name: analyze-package
description: Explore a Fastify plugin package and produce a structured analysis classifying code as "ours" vs "theirs" with passthrough behavior. Use this skill whenever the user asks to analyze, understand, break down, or explore a package — e.g., "what does packages/auth do?", "break down this plugin", "analyze packages/config". Also triggers as a prerequisite for /write-docs, /write-developer-docs, and /write-tests.
argument-hint: [package-path]
effort: low
---

# Analyze a Fastify Plugin Package

Analyze the package at: `$ARGUMENTS`

If no path is provided, use the current working directory.

Read `.claude/skills/CONVENTIONS.md` now before starting any analysis.

---

## Step 1: Read the Package

Read `src/plugin.ts` and `src/index.ts` first — these are the entry points. Then follow their imports to read only the files they reference. Do not read every file blindly; large packages will exhaust context.

Also read these files if they exist:

- `package.json`
- `README.md`
- `FEATURES.md`
- `GUIDE.md`
- Any existing tests in `src/__test__/`

From these files, identify: dependencies, exports, types, decorators, hooks, plugins, defaults, and conditional logic.

---

## Step 2: Classify Code — "Ours" vs "Theirs"

Go through each function and code block. Classify:

- **"Ours"**: Logic we wrote — conditionals, defaults, decorators, transformations, validation, option merging, utility functions, hooks, error handling, logging
- **"Theirs"**: Direct calls to third-party libraries with no transformation (e.g., just passing options through to `@fastify/swagger`)

**Example of a good classification:**

```
// OURS — conditional decorator with default value
if (opts.enableMetrics !== false) {
  fastify.decorate("metrics", { enabled: true, prefix: opts.prefix ?? "/metrics" });
}

// THEIRS — direct passthrough, no transformation
await fastify.register(fastifySwagger, opts.swagger);
```

---

## Step 3: Passthrough Analysis

For each dependency the package wraps, answer:

1. **Are all config options passed through?** Check if types come from the base library or if we define a subset.
2. **Do we transform, filter, or override any options?** Look for modifications before passing to the base library.
3. **Do we restrict any base library features?**
4. **What do we add on top?** List every feature our code adds.

### Output format

Print a section titled `## Base Library Passthrough Analysis` with a subsection per dependency:

```
### @scope/library-name — [FULL PASSTHROUGH | PARTIAL PASSTHROUGH | MODIFIED]

- Options type: [imported from base library | custom subset]
- Options passed: [unmodified | transformed — describe how]
- Features restricted: [none | list them]
- Features added: [list them]
```

---

## Step 4: Summary

Print a structured summary listing:

- Every function/export with a one-line description
- Every decorator added
- Every hook registered
- Every conditional branch (feature flags, enable/disable logic)
- Default values

### Completeness checklist

Your analysis is complete when you have:

- [ ] Classified every public export as "ours" or "theirs"
- [ ] Listed every Fastify decorator added
- [ ] Listed every Fastify hook registered
- [ ] Identified every conditional branch (enable/disable flags, feature toggles)
- [ ] Documented default values for all options we define
- [ ] Produced a passthrough classification for every wrapped dependency

If any item is missing, go back and fill it in before finishing.

### Save as ANALYSIS.md

Once the checklist is complete, write the full analysis to `ANALYSIS.md` in the package root. This file is the persistent handoff to downstream skills — it means `/write-docs`, `/write-developer-docs`, and `/write-tests` can read your analysis from disk instead of re-running it.

The file content is the same as what you printed: passthrough analysis + summary. Add this comment as the first line:

```
<!-- Package analysis — produced by /analyze-package. Do not edit manually. -->
```
