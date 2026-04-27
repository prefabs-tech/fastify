# @prefabs.tech/fastify-user

> **AI/agents:** Start with this package’s [docs/llm/INDEX.md](docs/llm/INDEX.md) and workspace [docs/llm/REFERENCE.md](../../../docs/llm/REFERENCE.md#user) before reading source.

## AI Quickstart

Package orientation: [docs/llm/INDEX.md](docs/llm/INDEX.md) · Workspace reference: [docs/llm/REFERENCE.md](../../../docs/llm/REFERENCE.md#user)

<!-- docgen:readme:start -->

## Public API (generated)

| Export | Kind | Description |
| --- | --- | --- |
| `areRolesExist` | const | — |
| `AuthUser` | interface | — |
| `ChangeEmailInput` | interface | — |
| `ChangePasswordInput` | interface | — |
| `computeInvitationExpiresAt` | const | — |
| `createInvitationsTableQuery` | const | — |
| `createRoleSortFragment` | const | — |
| `createUserContext` | const | — |
| `createUserFilterFragment` | const | — |
| `createUsersTableQuery` | const | — |
| `DEFAULT_USER_PHOTO_MAX_SIZE_IN_MB` | const | — |
| `EMAIL_VERIFICATION_MODE` | const | — |
| `EMAIL_VERIFICATION_PATH` | const | — |
| `EmailErrorMessages` | interface | — |
| `EmailOptions` | interface | — |
| `EmailVerificationRecipe` | interface | — |
| `ERROR_CODES` | const | — |
| `formatDate` | const | — |
| `getInvitationService` | const | — |
| `getOrigin` | const | — |
| `getUserService` | const | — |
| `hasUserPermission` | const | — |
| `INVITATION_ACCEPT_LINK_PATH` | const | — |
| `INVITATION_EXPIRE_AFTER_IN_DAYS` | const | — |
| `Invitation` | interface | — |
| `InvitationCreateInput` | type | — |
| `invitationResolver` | const | — |
| `invitationRoutes` | const | — |
| `InvitationService` | class | — |
| `InvitationSqlFactory` | class | — |
| `InvitationUpdateInput` | type | — |
| `IsEmailOptions` | interface | — |
| `isInvitationValid` | const | — |
| `isRoleExists` | const | — |
| `PasswordErrorMessages` | interface | — |
| `permissionResolver` | const | — |
| `permissionRoutes` | const | — |
| `PERMISSIONS_INVITATIONS_CREATE` | const | — |
| `PERMISSIONS_INVITATIONS_DELETE` | const | — |
| `PERMISSIONS_INVITATIONS_LIST` | const | — |
| `PERMISSIONS_INVITATIONS_RESEND` | const | — |
| `PERMISSIONS_INVITATIONS_REVOKE` | const | — |
| `PERMISSIONS_USERS_DISABLE` | const | — |
| `PERMISSIONS_USERS_ENABLE` | const | — |
| `PERMISSIONS_USERS_LIST` | const | — |
| `PERMISSIONS_USERS_READ` | const | — |
| `ProfileValidationClaim` | class | — |
| `RESET_PASSWORD_PATH` | const | — |
| `Resolver` | interface | — |
| `ROLE_ADMIN` | const | — |
| `ROLE_SUPERADMIN` | const | — |
| `ROLE_USER` | const | — |
| `roleResolver` | const | — |
| `roleRoutes` | const | — |
| `RoleService` | class | — |
| `ROUTE_CHANGE_EMAIL` | const | — |
| `ROUTE_CHANGE_PASSWORD` | const | — |
| `ROUTE_INVITATIONS_ACCEPT` | const | — |
| `ROUTE_INVITATIONS_CREATE` | const | — |
| `ROUTE_INVITATIONS_DELETE` | const | — |
| `ROUTE_INVITATIONS_GET_BY_TOKEN` | const | — |
| `ROUTE_INVITATIONS_RESEND` | const | — |
| `ROUTE_INVITATIONS_REVOKE` | const | — |
| `ROUTE_INVITATIONS` | const | — |
| `ROUTE_ME_PHOTO` | const | — |
| `ROUTE_ME` | const | — |
| `ROUTE_PERMISSIONS` | const | — |
| `ROUTE_ROLES_PERMISSIONS` | const | — |
| `ROUTE_ROLES` | const | — |
| `ROUTE_SIGNUP_ADMIN` | const | — |
| `ROUTE_USERS_DISABLE` | const | — |
| `ROUTE_USERS_ENABLE` | const | — |
| `ROUTE_USERS_FIND_BY_ID` | const | — |
| `ROUTE_USERS` | const | — |
| `sendEmail` | const | — |
| `sendInvitation` | const | — |
| `SessionRecipe` | interface | — |
| `StrongPasswordOptions` | interface | — |
| `SUPERTOKENS_CORS_HEADERS` | const | — |
| `supertokensErrorHandler` | const | — |
| `TABLE_INVITATIONS` | const | — |
| `TABLE_USERS` | const | — |
| `ThirdPartyEmailPasswordRecipe` | interface | — |
| `User` | interface | — |
| `UserConfig` | interface | — |
| `UserCreateInput` | type | — |
| `userResolver` | const | — |
| `userRoutes` | const | — |
| `userSchema` | const | — |
| `UserService` | class | — |
| `UserSqlFactory` | class | — |
| `UserUpdateInput` | type | — |
| `validateEmail` | const | — |
| `validatePassword` | const | — |
| `verifyEmail` | const | — |

Regenerate with `pnpm docs:generate`.

<!-- docgen:readme:end -->

A [Fastify](https://github.com/fastify/fastify) plugin that provides an easy integration of user model (service, controller, resolver) in a fastify API.

## Why this plugin?

User management—authentication, password hashing, multifactor sessions, session invalidation, and third-party SSO—is historically the most highly audited and volatile part of any backend system. We created this plugin to abstract that immense architectural complexity entirely by marrying SuperTokens directly into our monorepo toolset:

- **Provide a Drop-In Authentication System**: Seamlessly hooks into `@prefabs.tech/fastify-slonik`, `@prefabs.tech/fastify-mailer`, and Fastify routers to rigorously manage passwords, sessions, and login states internally out of the box.
- **Instant GraphQL and REST Architectures**: Bootstraps massively scaffolded REST routes, GraphQL schemas (`userSchema`), and graph resolvers natively so you don't have to ever architect or rewrite complex authentication layers again.
- **Enforce Security By Default**: It leverages battle-tested frameworks to natively handle strong password requirements, seamless refresh token rotations, and edge-case CORS protections inherently invisible to developers.

### Design Decisions: Why not custom JWTs, Passport.js, or Auth0?

1. **Security Vulnerabilities vs Homemade Systems**: Maintaining a homegrown JWT authentication flow commonly leads to compromised token invalidation states, XSS exposures, or improper cryptographic recycling. Relying on an enterprise-grade framework prevents critical breaches natively.
2. **Why SuperTokens specifically**: We chose SuperTokens because it is fully open-source, architecturally flawless, and allows for extensive local overrides (e.g., custom OAuth, native password reset emails). Unlike heavy restrictive SaaS products (like Auth0 or Firebase Auth), using SuperTokens in combination with our own databases ensures you actually possess, own, and control your users' data natively without vender lock-ins.

## Requirements

- [@fastify/cors](https://github.com/fastify/fastify-cors)
- [@fastify/formbody](https://github.com/fastify/fastify-formbody)
- [@prefabs.tech/fastify-config](../config/)
- [@prefabs.tech/fastify-mailer](../mailer/)
- [@prefabs.tech/fastify-s3](../s3/)
- [@prefabs.tech/fastify-slonik](../slonik/)
- [slonik](https://github.com/spa5k/fastify-slonik)
- [supertokens-node](https://github.com/supertokens/supertokens-node)

## Installation

Install with npm:

```bash
npm install @fastify/cors @fastify/formbody @prefabs.tech/fastify-config @prefabs.tech/fastify-mailer @prefabs.tech/fastify-s3 @prefabs.tech/fastify-slonik @prefabs.tech/fastify-user slonik supertokens-node
```

Install with pnpm:

```bash
pnpm add --filter "@scope/project" @fastify/cors @fastify/formbody @prefabs.tech/fastify-config @prefabs.tech/fastify-mailer @prefabs.tech/fastify-s3 @prefabs.tech/fastify-slonik @prefabs.tech/fastify-user slonik supertokens-node
```

## Usage

Register the user plugin with your Fastify instance:

```typescript
import corsPlugin from "@fastify/cors";
import formBodyPlugin from "@fastify/formbody";
import configPlugin from "@prefabs.tech/fastify-config";
import mailerPlugin from "@prefabs.tech/fastify-mailer";
import s3Plugin, { multipartParserPlugin } from "@prefabs.tech/fastify-s3";
import slonikPlugin, { migrationPlugin } from "@prefabs.tech/fastify-slonik";
import userPlugin, {
  SUPERTOKENS_CORS_HEADERS,
} from "@prefabs.tech/fastify-user";
import Fastify from "fastify";

import config from "./config";

import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { FastifyInstance } from "fastify";

const start = async () => {
  // Create fastify instance
  const fastify = Fastify({
    logger: config.logger,
  });

  // Register fastify-config plugin
  await fastify.register(configPlugin, { config });

  // Register cors plugin
  await fastify.register(corsPlugin, {
    allowedHeaders: ["Content-Type", ...SUPERTOKENS_CORS_HEADERS],
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    origin: config.appOrigin,
  });

  // Register form-body plugin
  await fastify.register(formBodyPlugin);

  // Register database plugin
  await fastify.register(slonikPlugin, config.slonik);

  // Register mailer plugin
  await fastify.register(mailerPlugin, config.mailer);

  // Register multipart content-type parser plugin
  await fastify.register(multipartParserPlugin);

  // Register s3 plugin
  await fastify.register(s3Plugin);

  // Register fastify-user plugin
  await fastify.register(userPlugin);

  // Run app database migrations
  await fastify.register(migrationPlugin, config.slonik);

  await fastify.listen({
    host: "0.0.0.0",
    port: config.port,
  });
};

start();
```

## Configuration

To add custom email and password validations:

```typescript
const config: ApiConfig = {
  // ...
  user: {
    //...
    email: {
      host_whitelist: ["..."],
    },
    password: {
      minLength: 8,
      minLowercase: 1,
      minNumbers: 1,
      minSymbols: 0,
      minUppercase: 0,
    },
  },
};
```

To overwrite ThirdPartyEmailPassword recipes from config:

```typescript
const config: ApiConfig = {
  // ...
  user: {
    //...
    recipes: {
      thirdPartyEmailPassword: {
        override: {
          apis: {
            appleRedirectHandlerPOST,
            authorisationUrlGET,
            emailPasswordEmailExistsGET,
            emailPasswordSignInPOST,
            emailPasswordSignUpPOST,
            generatePasswordResetTokenPOST,
            passwordResetPOST,
            thirdPartySignInUpPOST,
          },
          functions: {
            createResetPasswordToken,
            emailPasswordSignIn,
            emailPasswordSignUp,
            getUserById,
            getUserByThirdPartyInfo,
            getUsersByEmail,
            resetPasswordUsingToken,
            thirdPartySignInUp,
            updateEmailOrPassword,
          },
        sendEmail,
        signUpFeature: {
          formFields: [
            {
              id: "password",
              validate: async (password) => {
                // if password invalid return invalid message
              },
            },
            //...
          ],
        },
      },
    },
  },
};
```

**_NOTE:_** Each above overridden elements is a wrapper function. For example to override `emailPasswordSignUpPOST` see [emailPasswordSignUpPOST](src/supertokens/recipes/config/third-party-email-password/emailPasswordSignUpPost.ts).

## Using GraphQL

This package supports integration with [@prefabs.tech/fastify-graphql](../graphql/). Additionally, you will need to install [mercurius-auth](https://github.com/mercurius-js/auth) for authentication.

### Configuration

Add the required context for the fastify-user package by including `userPlugin` in your GraphQL configuration as shown below:

```typescript
import userPlugin from "@prefabs.tech/fastify-user";
import type { ApiConfig } from "@prefabs.tech/fastify-config";

const config: ApiConfig = {
  // ...other configurations...
  graphql: {
    // ...other graphql configurations...
    plugins: [userPlugin],
  },
  // ...other configurations...
};
```

### Schema Integration

The GraphQL schema provided by this package is located at [src/graphql/schema.ts](./src/graphql/schema.ts) and is exported as `userSchema`.

To load and merge this schema with your application's custom schemas, update your schema file as follows:

```typescript
import { userSchema } from "@prefabs.tech/fastify-user";
import { loadFilesSync } from "@graphql-tools/load-files";
import { mergeTypeDefs } from "@graphql-tools/merge";
import { makeExecutableSchema } from "@graphql-tools/schema";

const schemas: string[] = loadFilesSync("./src/**/*.gql");

const typeDefs = mergeTypeDefs([userSchema, ...schemas]);
const schema = makeExecutableSchema({ typeDefs });

export default schema;
```

### Resolver Integration

To integrate the resolvers provided by this package, import them and merge with your application's resolvers:

```typescript
import { userResolver } from "@prefabs.tech/fastify-user";

import type { IResolvers } from "mercurius";

const resolvers: IResolvers = {
  Mutation: {
    ...userResolver.Mutation,
  },
  Query: {
    ...userResolver.Query,
  },
};

export default resolvers;
```
