# @prefabs.tech/fastify-s3 — LLM index

AWS S3 client integration: uploads, object access, and Ajv-validated metadata; optional GraphQL upload paths.

## Task router

- **Public API / exports** → [src/index.ts](../../src/index.ts)
- **Plugin implementation** → [src/plugin.ts](../../src/plugin.ts)
- **Register plugin** → [src/__test__/plugin.test.ts](../../src/__test__/plugin.test.ts)
- **Service API** → [src/__test__/service.test.ts](../../src/__test__/service.test.ts)
- **GraphQL upload** → [src/plugins/__test__/graphqlUpload.test.ts](../../src/plugins/__test__/graphqlUpload.test.ts)

## Examples

Task-first table: [EXAMPLES.md](./EXAMPLES.md)

## Read order

This file → [workspace REFERENCE](../../../../docs/llm/REFERENCE.md#s3) → [EXAMPLES.md](./EXAMPLES.md) → service and GraphQL upload tests from REFERENCE or EXAMPLES.

## Boundaries

Do not scan all plugins under `src/plugins/` unless REFERENCE points there; prefer linked test files.

| Capability | Notes |
|----------|-------|
| S3 client | Configuration and service API |
| Uploads | Routes / handlers as documented |
| Validation | File metadata schemas |

- **Human docs:** [README.md](../../README.md) · [GUIDE.md](../../GUIDE.md)
