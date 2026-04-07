---
name: package-full
description: Run the full analysis, documentation, and test-writing pipeline for a Fastify plugin package. Use this skill when the user wants everything done for a package — analysis, FEATURES.md, GUIDE.md, README.md, and tests — e.g., "set up packages/auth from scratch", "full pipeline for this plugin", "document and test packages/config".
argument-hint: [package-path]
effort: high
---

# Full Package Pipeline

Run the complete pipeline for: `$ARGUMENTS`

If no path is provided, use the current working directory.

Follow the shared conventions in `.claude/skills/CONVENTIONS.md`. Read that file before starting.

This skill runs four phases in sequence. Complete each phase fully before starting the next. All phases operate on the same package directory.

---

## Phase 1: Analyze the Package

Run `/analyze-package $ARGUMENTS` and wait for it to complete.

This produces the structured analysis (ours vs theirs classification, passthrough analysis, summary) that all subsequent phases depend on.

---

## Phase 2: Write FEATURES.md and GUIDE.md

Run `/write-docs $ARGUMENTS` and wait for it to complete.

This produces FEATURES.md (structured feature inventory for test generation) and GUIDE.md (comprehensive developer guide).

---

## Phase 3: Write README.md

Run `/write-developer-docs $ARGUMENTS` and wait for it to complete.

This produces the developer-facing README.md with passthrough classifications, key features, and usage guidelines.

---

## Phase 4: Write and Run Tests

Run `/write-tests $ARGUMENTS` and wait for it to complete.

This uses FEATURES.md from Phase 2 to determine what to test, writes the tests, runs them, and fixes any failures.

---

## Output Summary

When all four phases are complete, print a combined summary:

- Number of features documented in FEATURES.md
- Number of features covered in GUIDE.md
- Number of use cases in GUIDE.md
- Passthrough classifications per dependency
- Number of base library sections in README.md
- Number of high-level features in README.md
- Whether Usage Guidelines section was written
- Number of tests written
- Test results (pass/fail)
- Any concerns found
