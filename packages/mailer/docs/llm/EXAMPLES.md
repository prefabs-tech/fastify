# @prefabs.tech/fastify-mailer — task → file

Paths are relative to the package root (`packages/mailer/`).

| Task | Open first | Why |
|------|------------|-----|
| Register mailer plugin | [src/__test__/registration.test.ts](../../src/__test__/registration.test.ts) | Plugin bootstrap |
| HTTP test routes | [src/__test__/testRoute.test.ts](../../src/__test__/testRoute.test.ts) | Route surface |
| Send mail / transport | [src/__test__/sendMail.test.ts](../../src/__test__/sendMail.test.ts) | Sending behavior |
| Test config helper | [src/__test__/helpers/createMailerConfig.ts](../../src/__test__/helpers/createMailerConfig.ts) | Fixture-style config |
| Public exports | [src/index.ts](../../src/index.ts) | API surface |
| Plugin implementation | [src/plugin.ts](../../src/plugin.ts) | Fastify registration |
