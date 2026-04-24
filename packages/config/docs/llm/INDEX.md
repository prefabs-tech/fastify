# @prefabs.tech/fastify-config — LLM index

Typed Fastify configuration: `fastify.config` / `request.config` from env and optional JSON, with Ajv-backed schema validation and a small `parse()` helper for env coercion.

**Read order:** this file → [workspace REFERENCE](../../../../docs/llm/REFERENCE.md#config) → [GUIDE.md](../../GUIDE.md) → open only the source/test paths linked from REFERENCE.

| Capability | Notes |
|----------|-------|
| Instance + request config | `ApiConfig`, hostname helper |
| Parsing | `parse()` for env values |
| Validation | Schema + Ajv at plugin boundary |

**Do not** scan all of `src/` unless REFERENCE links are missing or clearly stale; prefer [plugin tests](../../src/__test__/plugin.test.ts) after REFERENCE.

- **Human docs:** [README.md](../../README.md) · [GUIDE.md](../../GUIDE.md)
