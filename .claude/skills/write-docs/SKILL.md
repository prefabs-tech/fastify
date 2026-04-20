---
name: write-docs
description: Create or update FEATURES.md and GUIDE.md for a Fastify plugin package based on source code analysis. Use this skill when the user asks to document a package, write docs, create a guide, or generate a feature list — e.g., "document packages/auth", "write docs for this plugin", "create a guide for packages/config".
argument-hint: [package-path]
effort: medium
---

# Write Documentation for a Fastify Plugin Package

Document the package at: `$ARGUMENTS`

If no path is provided, use the current working directory.

Read `.claude/skills/CONVENTIONS.md` now before starting any work.

---

## Prerequisites

Check for analysis in this order:

1. **`ANALYSIS.md` exists in the package** → read it now. Use it as the analysis for all subsequent steps. Do not re-run analysis.
2. **`/analyze-package` was already run in this conversation** → use that analysis from context.
3. **Neither** → run `/analyze-package $ARGUMENTS` now and wait for it to complete. It will write ANALYSIS.md for future use.

---

## Part 1: Create or Update FEATURES.md

Create or update `FEATURES.md` in the package root.

**If FEATURES.md already exists:** Read it first. Preserve features that are still accurate. Only add, remove, or modify features where the source code has changed. Do not rewrite from scratch unless the existing file is fundamentally wrong.

This file is a **structured feature inventory consumed by automated test generation** (`/write-tests`). It is NOT the developer-facing documentation — that's GUIDE.md.

Add this comment as the first line of FEATURES.md:

```
<!-- Structured feature inventory — used by automated test generation. Developer docs: see GUIDE.md -->
```

### Rules

1. **Only list features our code adds.** Do not list features of base libraries — developers can read those libraries' official docs.
2. Number every feature sequentially.
3. Group features under category headings (`##`).
4. Add a code example to a feature ONLY if it needs one to show usage. Do not add examples to self-explanatory features.
5. Code examples should be minimal — just enough to show the feature, no boilerplate.

### How to identify features

A "feature" is any behavior our code provides. Extract from source code:

- Plugin registration behavior (what it sets up)
- Configuration options we define (not passthrough options from base libraries)
- Fastify decorators we add
- Fastify hooks we register
- Default values we provide
- Conditional behaviors (enable/disable flags)
- Type exports and module augmentations
- Utility functions exposed to consumers
- Error handling and logging we add

### Reference

See `packages/firebase/FEATURES.md` for the expected format.

---

## Part 2: Create or Update GUIDE.md

Create or update `GUIDE.md` in the package root.

**If GUIDE.md already exists:** Read it first. Preserve sections that are still accurate — especially hand-written examples and use cases. Only update sections where the source code has changed. Do not rewrite from scratch unless the existing file is fundamentally wrong.

This is the **comprehensive developer guide** — the main documentation file for developers using this package. It covers installation, base library passthrough details, every feature with code examples, and practical use cases.

This is different from:

- **FEATURES.md** — structured inventory for test generation (not meant for humans to read end-to-end)
- **README.md** — landing page for scanning (produced by `/write-developer-docs`)

### Structure

**Important: Omit any section that does not apply to this package.** For example, skip "Base Libraries" entirely if the package wraps no dependencies. Do not write empty or "N/A" sections — just leave them out.

Use the following template:

```markdown
# {package-name} — Developer Guide

## Installation

### For package consumers

\`\`\`bash
npm install {package-name}
\`\`\`

\`\`\`bash
pnpm add {package-name}
\`\`\`

### For monorepo development

\`\`\`bash
pnpm install
pnpm --filter {package-name} test
pnpm --filter {package-name} build
\`\`\`

## Setup

{Show a complete, working setup once — imports, config object, plugin registration. State that all subsequent examples assume this setup. This eliminates boilerplate repetition in later sections.}

---

## Base Libraries

{One subsection per wrapped dependency. Skip this entire section if the package wraps nothing.}

### {library} — {Full Passthrough | Partial Passthrough | Modified}

{What this library provides, in one sentence.}

-> **Their docs:** [{library}]({docs-url})

{For FULL: "All config options are passed through unchanged. See their docs for the full API."}

{For PARTIAL: "Most options are passed through. We change:" + delta list of only what we modify/restrict/default.}

{For MODIFIED: "We wrap this library with a different surface:" + describe what's available and different.}

**What we add on top:** {list our additions related to this library}

---

## Features

{One subsection per feature or feature group. Every feature the package provides gets covered here with a description and code example. Group related features under a single heading when it improves readability.}

### {Feature Name}

{What it does, when you'd use it. 1-3 sentences.}

\`\`\`typescript
// code example showing usage
\`\`\`

---

## Use Cases

{Practical scenarios showing how features combine to solve real problems. Each use case describes a situation a developer might face and shows the solution using this package.}

### {Scenario title}

{1-2 sentence setup: "When you need to X..." or "If your app requires Y..."}

\`\`\`typescript
// code showing the complete solution
\`\`\`
```

### Rules

1. **Cover every feature the package provides.** GUIDE.md must be comprehensive — a developer should not need to read source code to understand what's available. Check against FEATURES.md to ensure nothing is missed.
2. **Do not repeat base library documentation in detail.** Link to their docs. Only describe what we change, restrict, or add on top.
3. **Code examples are required** for every feature and every use case. Keep them minimal but complete enough to copy-paste.
4. **Do not repeat the full setup** in every example. Show setup once at the top, then reference it.
5. **Use cases should be realistic.** Think about what developers actually build with this package. Examples: "Handling third-party auth errors", "Multi-tenant configuration", "Development vs. production logging".

### What NOT to include

- Do not repeat the full config object in every example — show setup once
- Do not include deployment/environment-specific config examples
- Do not add explanations for things obvious from the code example

---

## Output Summary

When done, print:

- Number of features documented in FEATURES.md
- Number of features covered in GUIDE.md
- Number of use cases in GUIDE.md
- Number of base library sections in GUIDE.md (with classifications)
