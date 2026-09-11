# Domain

Product and business knowledge: what the concepts in the code _mean_ to the business, and the rules that are decisions rather than technical necessities.

This is the section least recoverable from the codebase and therefore the most valuable to fill.

# Concepts

- [Users, Roles, and Permissions](users-roles-and-permissions.md) - What a user is in this system (a SuperTokens identity paired with an app users row), the states a user moves through, how roles and permissions are seeded and checked, and the special first-admin and profile-validation rules.
- [Invitations](invitations.md) - The invitation entity that onboards a user into a given role (and optionally a given client app), the rules checked when one is created, its pending/accepted/revoked/expired states, and what accepting one does.
