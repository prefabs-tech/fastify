---
type: Domain Concept
title: Invitations
description: The invitation entity that onboards a user into a given role (and optionally a given client app), the rules checked when one is created, its pending/accepted/revoked/expired states, and what accepting one does.
tags: [domain, invitations, onboarding, roles, user]
status: draft
generated:
  by: claude-code/claude-opus-5
  at: 2026-09-11T07:05:21Z
sources:
  - id: ddl
    resource: repo://packages/user/src/migrations/queries.ts#L28-L53
    title: invitations table
  - id: expires
    resource: repo://packages/user/src/lib/computeInvitationExpiresAt.ts#L7-L19
    title: Expiry computation
  - id: service
    resource: repo://packages/user/src/model/invitations/service.ts#L32-L123
    title: InvitationService (findByToken, preCreate)
  - id: create
    resource: repo://packages/user/src/model/invitations/handlers/createInvitation.ts#L12-L75
    title: Create handler
  - id: send
    resource: repo://packages/user/src/lib/sendInvitation.ts#L9-L39
    title: sendInvitation origin resolution
  - id: link
    resource: repo://packages/user/src/lib/getInvitationLink.ts#L7-L25
    title: Invitation link
  - id: valid
    resource: repo://packages/user/src/lib/isInvitationValid.ts#L3-L9
    title: Validity rule
  - id: accept
    resource: repo://packages/user/src/model/invitations/handlers/acceptInvitation.ts#L19-L106
    title: Accept handler
  - id: revoke
    resource: repo://packages/user/src/model/invitations/handlers/revokeInvitation.ts#L10-L48
    title: Revoke handler
  - id: resend
    resource: repo://packages/user/src/model/invitations/handlers/resendInvitation.ts#L10-L44
    title: Resend handler
  - id: delete
    resource: repo://packages/user/src/model/invitations/handlers/deleteInvitation.ts#L8-L29
    title: Delete handler
  - id: controller
    resource: repo://packages/user/src/model/invitations/controller.ts#L28-L106
    title: Routes and permissions
  - id: constants
    resource: repo://packages/user/src/constants.ts#L1-L11
    title: Invitation constants
  - id: config
    resource: repo://packages/user/src/types/config.ts#L83-L95
    title: invitation config
---

# Invitations

An invitation lets someone with the `invitations:create` permission onboard a person by email **into a specific role**, and optionally for a specific client app. The invited person signs up through the invitation instead of open sign-up.

## Entity
`invitations`: `id`, `email`, `role`, `app_id?`, `token` (UUID, `gen_random_uuid()`, unique), `invited_by_id` (FK → users), `payload` (JSONB), `expires_at`, `accepted_at`, `revoked_at`, `created_at`, `updated_at`.[^ddl]

## States
```
             ┌─ accept ──► accepted
pending ─────┼─ revoke ──► revoked
             └─ time   ──► expired      (expires_at < now)
(any state) ── delete ──► removed
```
An invitation is **valid** only when it has no `acceptedAt`, no `revokedAt`, and `now <= expiresAt`.[^valid]

## Creation rules (`InvitationService.preCreate`)
Checked in this order; each failure is a `CustomError`, which the handler turns into **422** carrying the error `code`:[^service][^create]
1. `expiresAt` = the provided value, or now + `config.user.invitation.expireAfterInDays` days (**default 30**).[^expires][^constants]
2. The email passes `validateEmail`, which honours `config.user.email` options (`INVALID_EMAIL`).
3. No user already has this email (`USER_ALREADY_EXISTS`).
4. The role exists in SuperTokens (`ROLE_NOT_FOUND`).
5. If `appId` matches a configured app, that app's `supportedRoles` includes the role (`ROLE_NOT_SUPPORTED`).
6. **At most one valid invitation per email**: no row with that email that is unaccepted, unrevoked and unexpired (`INVITATION_ALREADY_EXISTS`).

`payload` is stored as JSON only when non-empty. The **token is removed** from every API response: create, revoke, resend and delete.[^create][^revoke][^resend][^delete]

## The invitation email
`sendInvitation` is called **without `await`**; send failures are logged, not returned.[^create] The link origin is chosen in this order:[^send]
1. The origin of the app matching `invitation.appId`.
2. The origin of the request's `Referer` header, else its `Origin` header, else `fastify.hostname`.
3. `config.appOrigin[0]`.

The link is `acceptLinkPath` (default `/signup/token/:token`) with `:token` substituted, resolved against that origin.[^link] Subject and template default to "Invitation for sign up" and `user-invitation`, overridable through `emailOverrides.invitation`.

## Accepting (`POST /invitations/token/:token`, no session)
1. Validate email format and password strength. A weak password is rejected with a generic "Invalid password", because the code reads the email result's message.[^accept]
2. Look up by token. A non-UUID token is treated as not found.[^service]
3. 422 if missing or not valid; 422 if the submitted email differs from the invitation's email.
4. SuperTokens email/password sign-up with `roles: [invitation.role]` and `autoVerifyEmail: true`. This runs the package's sign-up override, which creates the users row and assigns the role ([user component](../components/user.md#keeping-supertokens-and-users-in-step)). An existing account gives 422 `EMAIL_ALREADY_EXISTS_ERROR`.
5. Set `acceptedAt`.
6. Run `config.user.invitation.postAccept(request, invitation, user)` if configured. Its errors are logged and swallowed.[^config]
7. Create a session, so the user is logged in, and return the user with `roles: [role]`.

> Inference: steps 4-5 are not in a transaction. If step 5 fails after sign-up succeeded, the account exists but the invitation still reads as pending.

`GET /invitations/token/:token` is also public, so the sign-up page can show the invitation.[^controller]

## Managing invitations (session + permission)
| Action | Permission | Behaviour |
|--------|------------|-----------|
| list `GET /invitations` | `invitations:list` | paginated list |
| revoke `PUT /invitations/revoke/:id` | `invitations:revoke` | 422 if not found, already accepted, expired, or already revoked; otherwise sets `revokedAt`[^revoke] |
| resend `POST /invitations/resend/:id` | `invitations:resend` | an invalid invitation returns **200** with `{ status: "ERROR", message }`; otherwise re-sends the **same token**, with no new expiry[^resend] |
| delete `DELETE /invitations/:id` | `invitations:delete` | 404 if nothing was deleted[^delete] |

Remember that these permission checks only apply when the permission names appear in `config.user.permissions` ([Users, roles, and permissions](users-roles-and-permissions.md#permissions)).

[^ddl]: `token UUID DEFAULT gen_random_uuid() UNIQUE`; `FOREIGN KEY (invited_by_id) REFERENCES users (id)`.
[^valid]: `!(acceptedAt || revokedAt || Date.now() > expiresAt)`.
[^service]: `findByToken` L32-45 (UUID regex L119-123); `preCreate` L47-117.
[^create]: Errors wrapped with `httpErrors.createError(422, message, { code })`; `sendInvitation(server, invitation, url)` without await; `delete data.token`.
[^expires]: `expireTime || formatDate(now + (expireAfterInDays ?? 30) days)`.
[^constants]: `INVITATION_EXPIRE_AFTER_IN_DAYS = 30`, `INVITATION_ACCEPT_LINK_PATH = "/signup/token/:token"`.
[^send]: `apps.find(app.id === invitation.appId)?.origin || getOrigin(url) || appOrigin[0]`, where `url` is `referer || origin || hostname` from the handler.
[^link]: `new URL(path.replaceAll(/:token(?!\w)/g, token), origin).href`.
[^accept]: L44-47: `passwordStrength` failure throws `emailResult.message || "Invalid password"`.
[^config]: `postAccept?: (request, invitation, user) => Promise<void>`; also `acceptLinkPath` and `expireAfterInDays`.
[^revoke]: Four guard checks, then `update(id, { revokedAt })`.
[^resend]: `reply.send({ message: "Invitation is invalid or has expired", status: "ERROR" })`.
[^delete]: `service.delete(id)`; `notFound` if the result is falsy.
[^controller]: `GET` and `POST` on `/invitations/token/:token` have no preHandler; the others chain `verifySession` and `hasPermission`.
