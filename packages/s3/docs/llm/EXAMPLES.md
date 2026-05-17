# @prefabs.tech/fastify-s3 — task → file

Paths are relative to the package root (`packages/s3/`).

| Task | Open first | Why |
|------|------------|-----|
| Register plugin | [src/__test__/plugin.test.ts](../../src/__test__/plugin.test.ts) | Core registration |
| S3 service usage | [src/__test__/service.test.ts](../../src/__test__/service.test.ts) | Client/service API |
| GraphQL upload path | [src/plugins/__test__/graphqlUpload.test.ts](../../src/plugins/__test__/graphqlUpload.test.ts) | Upload plugin integration |
| Public exports | [src/index.ts](../../src/index.ts) | API surface |
| Plugin implementation | [src/plugin.ts](../../src/plugin.ts) | Fastify registration |
