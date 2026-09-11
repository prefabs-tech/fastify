# Troubleshooting

Symptom → cause → fix. Add an entry whenever something costs you more than a few minutes to diagnose; the next person is usually you.

# Concepts

- [GraphQL Uploads Return 415 or an Empty Body](graphql-uploads-415-or-empty-body.md) - Symptoms around multipart GraphQL uploads and catch-all body parsing (a silent 415, an intermittently undefined request body, a boot error about an existing parser, uploads consumed by the wrong parser) with the cause and fix for each.
- [SuperTokens Is Already Initialised](supertokens-already-initialised.md) - Boot fails with "SuperTokens is already initialised. Register SuperTokens recipe plugins before @prefabs.tech/fastify-user." because a recipe plugin was registered after the user plugin.
- [Stale Sibling Build](stale-sibling-build.md) - Tests or typecheck in one package fail, or pass against old behaviour, after changing a sibling package, because siblings are consumed from dist/ and neither test nor typecheck rebuilds them.
- [CommonJS and ESM Import Breakage](cjs-esm-import-breakage.md) - A dependency works in one of the package's two builds (dist .cjs or .js) but breaks in the other, or a dependency's subpath module ends up bundled into dist, with the fixes recorded in history for firebase-admin, stack-trace, and subpath externals.
