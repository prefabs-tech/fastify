# @prefabs.tech/fastify-mailer — LLM index

Transactional email: Nodemailer + MJML templates, Fastify routes for testing or operational hooks, and recipient/configuration patterns.

## Task router

- **Public API / exports** → [src/index.ts](../../src/index.ts)
- **Plugin implementation** → [src/plugin.ts](../../src/plugin.ts)
- **Register plugin** → [src/__test__/registration.test.ts](../../src/__test__/registration.test.ts)
- **HTTP routes** → [src/__test__/testRoute.test.ts](../../src/__test__/testRoute.test.ts)
- **Send mail** → [src/__test__/sendMail.test.ts](../../src/__test__/sendMail.test.ts)

## Examples

Task-first table: [EXAMPLES.md](./EXAMPLES.md)

## Read order

This file → [workspace REFERENCE](../../../../docs/llm/REFERENCE.md#mailer) → [EXAMPLES.md](./EXAMPLES.md) → registration and route tests from REFERENCE or EXAMPLES.

## Boundaries

Do not enumerate every file under `src/`; use REFERENCE/EXAMPLES links first.

| Capability | Notes |
|----------|-------|
| Sending | MJML → HTML, transport config |
| Routes | Test or app-specific HTTP surface |
| Config | Mailer options and helpers |

- **Human docs:** [README.md](../../README.md) · [GUIDE.md](../../GUIDE.md)
