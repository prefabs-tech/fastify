# Skills

Slash commands for analyzing, documenting, and testing Fastify plugin packages.

All skills share conventions defined in [CONVENTIONS.md](CONVENTIONS.md) — testing rules, code example standards, Fastify 5 gotchas, and base library documentation patterns.

## Dependency Graph

Skills automatically invoke their prerequisites. You do not need to chain them manually.

```
/analyze-package          (no dependencies — reads source code)
    ↓
/write-docs               (runs /analyze-package if needed)
    ↓
/write-developer-docs     (runs /analyze-package if needed)
/write-tests              (runs /write-docs if FEATURES.md missing)
```

Orchestrator skills run the full chain:

```
/package-developer-docs   →  /analyze-package → /write-developer-docs
/package-full             →  /analyze-package → /write-docs → /write-developer-docs → /write-tests
```

## Available Skills

| Skill                            | Description                                               | Produces                                |
| -------------------------------- | --------------------------------------------------------- | --------------------------------------- |
| `/analyze-package <path>`        | Explore source code and classify it as "ours" vs "theirs" | `ANALYSIS.md`, analysis in conversation |
| `/write-docs <path>`             | Create/update FEATURES.md and GUIDE.md                    | `FEATURES.md`, `GUIDE.md`               |
| `/write-developer-docs <path>`   | Create/update README.md for developer evaluation          | `README.md`                             |
| `/write-tests <path>`            | Write and run unit tests                                  | `src/__test__/*.test.ts`                |
| `/package-developer-docs <path>` | Orchestrator: analyze → developer-docs                    | Analysis + `README.md`                  |
| `/package-full <path>`           | Orchestrator: analyze → docs → developer-docs → tests     | All docs + tests                        |

## Usage

### Full pipeline (new package)

```
/package-full packages/my-plugin
```

Runs analyze → docs → developer-docs → tests in order. Use this when starting from scratch.

### Individual skills (self-sufficient)

Each skill auto-invokes its prerequisites if needed. Run any skill standalone:

```
/write-docs packages/my-plugin             # auto-runs /analyze-package first
/write-developer-docs packages/my-plugin   # auto-runs /analyze-package first
/write-tests packages/my-plugin            # auto-runs /write-docs if FEATURES.md missing
```

### Reusing analysis in one conversation

If you run `/analyze-package` first, downstream skills detect the existing analysis and skip re-running it:

```
/analyze-package packages/my-plugin        # explore and classify code
/write-docs packages/my-plugin             # reuses analysis above (no re-run)
/write-developer-docs packages/my-plugin   # reuses analysis above (no re-run)
```

### Common scenarios

| Scenario                           | What to run                        |
| ---------------------------------- | ---------------------------------- |
| New package, need everything       | `/package-full`                    |
| Just need README for evaluation    | `/package-developer-docs`          |
| Docs exist, just need tests        | `/write-tests`                     |
| Source changed, update docs only   | `/write-docs`                      |
| Want to understand a package first | `/analyze-package`                 |
| Tests broke after dependency bump  | `/write-tests` (fix/rewrite tests) |

## Reference packages

- `packages/firebase` — has FEATURES.md and comprehensive tests
- `packages/config` — has GUIDE.md as the format reference
