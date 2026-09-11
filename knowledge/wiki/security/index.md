# Security

Threat model and the controls that address it - credential storage, authentication and token handling, transport, and permissions. Covers where secrets live, who can reach what, and the decisions behind each boundary.

# Concepts

- [Authentication and Authorization](authentication-and-authorization.md) - The trust boundaries of an app built on these packages and the controls on each (SuperTokens session transport and verification, user-state enforcement, claims, permission checks on REST and GraphQL, credential policies, App Check, and error disclosure).
- [Secrets and Credentials](secrets-and-credentials.md) - Where secrets enter an app built on these packages (never through environment variables read by the packages, always through config or options objects), which config fields carry them, which CI secrets the release workflows use, and where secret-bearing data can reach logs or responses.
