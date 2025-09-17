# @prefabs.tech/fastify-user

A [Fastify](https://github.com/fastify/fastify) plugin that provides an easy integration of user model (service, controller, resolver) in a fastify API.

## Requirements

* [@fastify/cors](https://github.com/fastify/fastify-cors)
* [@fastify/formbody](https://github.com/fastify/fastify-formbody)
* [@prefabs.tech/fastify-config](../config/)
* [@prefabs.tech/fastify-mailer](../mailer/)
* [@prefabs.tech/fastify-s3](../s3/)
* [@prefabs.tech/fastify-slonik](../slonik/)
* [slonik](https://github.com/spa5k/fastify-slonik)
* [supertokens-node](https://github.com/supertokens/supertokens-node)

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
import userPlugin, { SUPERTOKENS_CORS_HEADERS } from "@prefabs.tech/fastify-user";
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
    origin: config.appOrigin,
    allowedHeaders: ["Content-Type", ...SUPERTOKENS_CORS_HEADERS],
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    credentials: true,
  });

  // Register form-body plugin
  await fastify.register(formBodyPlugin);

  // Register database plugin
  await fastify.register(slonikPlugin, config.slonik);

  // Register mailer plugin
  await fastify.register(mailerPlugin, config.mailer);

  // Register multipart content-type parser plugin
  await api.register(multipartParserPlugin);
  
  // Register mailer plugin
  await fastify.register(s3Plugin);

  // Register fastify-user plugin
  await fastify.register(userPlugin);

  // Run app database migrations
  await fastify.register(migrationPlugin, config.slonik);
  
  await fastify.listen({
    port: config.port,
    host: "0.0.0.0",
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
      host_whitelist: ["..."]
    },
    password: {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 0,
      minNumbers: 1,
      minSymbols: 0,
    }
  }
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
import { usersResolver } from "@prefabs.tech/fastify-user";

import type { IResolvers } from "mercurius";

const resolvers: IResolvers = {
  Mutation: {
    ...usersResolver.Mutation,
  },
  Query: {
    ...userResolver.Query,
  },
};

export default resolvers;
```
