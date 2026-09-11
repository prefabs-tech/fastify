# Reference

Standing explanations of concepts, terms, and external systems the project depends on - written once and consulted rather than rediscovered. Covers the background knowledge needed to read the rest of the wiki without chasing outside sources.

# Concepts

- [SuperTokens Integration Model](supertokens-integration-model.md) - The SuperTokens concepts the user and phone-auth packages assume (core vs SDK, recipes, single init, apis vs functions overrides, userContext), how this repo layers its overrides, and what a consumer override replaces.
- [Fastify Encapsulation in This Repo](fastify-encapsulation.md) - The Fastify 5 plugin mechanics every package relies on (fastify-plugin wrapping, decorators vs per-request assignment, idempotency guards, named plugins, parser snapshotting, onReady, the single error handler) and where each shows up in the code.
