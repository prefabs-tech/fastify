---
name: package-developer-docs
description: Run analysis then generate developer-facing README.md for a Fastify plugin package. Use this skill when the user wants a README with analysis — e.g., "create a README for packages/auth", "I need developer docs for this plugin".
argument-hint: [package-path]
effort: medium
---

# Package Developer Docs Pipeline

Generate developer-facing documentation for: `$ARGUMENTS`

If no path is provided, use the current working directory.

This skill runs two steps in sequence. Complete each step fully before starting the next.

---

## Step 1: Analyze the Package

Run `/analyze-package $ARGUMENTS` and wait for it to complete.

---

## Step 2: Write README.md

Run `/write-developer-docs $ARGUMENTS` and wait for it to complete. It will use the analysis from Step 1.

---

## Output Summary

When both steps are complete, print:

- Passthrough classifications per dependency
- Number of base library sections written
- Number of high-level features listed
- Whether FEATURES.md and GUIDE.md exist (for linking)
