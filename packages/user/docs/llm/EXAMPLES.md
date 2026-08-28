# @prefabs.tech/fastify-user — task → file

Paths are relative to the package root (`packages/user/`).

Structured, numbered capability list (routes, invitations, GraphQL ops): see [FEATURES.md](../../FEATURES.md) — e.g. items **24–25** (`/signup/admin`), the **Invitations** section (**45+**), and **73–74** (GraphQL user/invitation operations).

| Task | Open first | Why |
|------|------------|-----|
| Register user / SuperTokens plugin | [src/__test__/plugin.test.ts](../../src/__test__/plugin.test.ts) | Primary entry test |
| Bootstrap first admin (REST `POST` / `GET /signup/admin`) | [src/model/users/handlers/adminSignUp.ts](../../src/model/users/handlers/adminSignUp.ts) | Handler body; routes registered alongside other user routes in [src/model/users/controller.ts](../../src/model/users/controller.ts) |
| Bootstrap admin (`adminSignUp` mutation) | [src/model/users/graphql/resolver.ts](../../src/model/users/graphql/resolver.ts) | Mutation implementation; SDL in [src/model/users/graphql/schema.ts](../../src/model/users/graphql/schema.ts) |
| Create invitation | [src/model/invitations/handlers/createInvitation.ts](../../src/model/invitations/handlers/createInvitation.ts) | Starts onboarding flow for additional users |
| Accept invitation (token → SuperTokens account + session) | [src/model/invitations/handlers/acceptInvitation.ts](../../src/model/invitations/handlers/acceptInvitation.ts) | Completes onboarding after invite |
| Invitation REST wiring | [src/model/invitations/controller.ts](../../src/model/invitations/controller.ts) | Registers invitation routes → handlers |
| Product email/password sign-up (SuperTokens recipe) | [src/supertokens/recipes/config/third-party-email-password/emailPasswordSignUp.ts](../../src/supertokens/recipes/config/third-party-email-password/emailPasswordSignUp.ts) | Sign-up overrides; defaults merged in [src/supertokens/recipes/config/thirdPartyEmailPasswordRecipeConfig.ts](../../src/supertokens/recipes/config/thirdPartyEmailPasswordRecipeConfig.ts) |
| Route/path constants (`ROUTE_SIGNUP_ADMIN`, etc.) | [src/constants.ts](../../src/constants.ts) | Canonical path strings |
| Deeper behavior | [src/](../../src/) nested `**/__test__` | Only after plugin test; follow imports or workspace REFERENCE |
| Public exports | [src/index.ts](../../src/index.ts) | API surface |
| Plugin implementation | [src/plugin.ts](../../src/plugin.ts) | Fastify registration |
