# @prefabs.tech/fastify-error-handler — LLM index

Central Fastify error handling: consistent error payloads, stack masking in production, and hooks such as `preParsing` integration for early failures.

**Read order:** this file → [workspace REFERENCE](../../../../docs/llm/REFERENCE.md#error-handler) → [GUIDE.md](../../GUIDE.md) → linked sources/tests from REFERENCE only.

| Capability | Notes |
|----------|-------|
| Global errors | Unified shape, logging alignment |
| Security | Stack traces hidden where configured |
| Hooks | Registration order matters—see GUIDE |

**Do not** scan full `src/` without going through REFERENCE first; nested helpers are implementation details.

- **Human docs:** [README.md](../../README.md) · [GUIDE.md](../../GUIDE.md)
