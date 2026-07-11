# @prefabs.tech/fastify-s3

A [Fastify](https://github.com/fastify/fastify) plugin that provides an easy integration of S3 in a fastify API.

## Why this plugin?

Handling file uploads in a full-stack context requires substantially more effort than simply pushing byte streams to an S3 bucket via the AWS SDK. You must parse multipart requests, handle potential filename collisions securely, stream data to S3, and immediately synchronize metadata flags to your database. We created this plugin to:

- **Automate the Full Upload Lifecycle**: From intercepting `multipart/form-data` chunks (via internal parsers), writing to S3, and saving strict structured metadata natively into our `@prefabs.tech/fastify-slonik` powered databases—this plugin handles the entire flow.
- **Standardize Duplication Strategies**: It provides out-of-the-box mechanisms (`error`, `add-suffix`, `override`) to elegantly handle duplicate filenames with zero effort.
- **Bridge REST & GraphQL**: File uploads work over REST (via `@fastify/multipart` and the `ajvFilePlugin` Swagger helper) and over GraphQL (via the upload transport that [@prefabs.tech/fastify-graphql](../graphql/) registers when enabled) — with a single `FileService` consuming either.

### Design Decisions: Why not @aws-sdk/client-s3 and @fastify/multipart directly?

- **Too Much Boilerplate**: While those granular tools are fantastic, manually aggregating them to handle incoming parsed streams, S3 buffering, database synchronization, and Swagger schema injection per-route results in massive duplication of boilerplate code across microservices.
- **Ecosystem Homogenization**: This plugin strictly binds the AWS SDK into our ecosystem's database architecture (`fastify-slonik`), affording you a unified `FileService` that is ready to execute uploads and metadata queries perfectly right after registration.

## Requirements

Peer dependencies (install compatible versions — see [package.json](./package.json)):

- [@prefabs.tech/fastify-config](../config/)
- [@prefabs.tech/fastify-error-handler](../error-handler/)
- [@prefabs.tech/fastify-graphql](../graphql/)
- [@prefabs.tech/fastify-slonik](../slonik/)
- [`fastify`](https://www.npmjs.com/package/fastify)
- [`fastify-plugin`](https://www.npmjs.com/package/fastify-plugin)
- [`slonik`](https://www.npmjs.com/package/slonik)
- [`zod`](https://www.npmjs.com/package/zod)

## Installation

Install with npm:

```bash
npm install @prefabs.tech/fastify-config @prefabs.tech/fastify-error-handler @prefabs.tech/fastify-graphql @prefabs.tech/fastify-slonik @prefabs.tech/fastify-s3 fastify fastify-plugin slonik zod
```

Install with pnpm:

```bash
pnpm add --filter "@scope/project" @prefabs.tech/fastify-config @prefabs.tech/fastify-error-handler @prefabs.tech/fastify-graphql @prefabs.tech/fastify-slonik @prefabs.tech/fastify-s3 fastify fastify-plugin slonik zod
```

## Usage

### Permission

When using AWS S3, you are required to enable the following permissions:

**_Required Permission:_**

- GetObject Permission
- GetObjectAttributes Permission
- PutObject Permission

**_Optional Permissions:_**

- ListBucket Permission
  - If you choose the `add-suffix` option for FilenameResolutionStrategy when dealing with duplicate files, then you have to enable this permission.
- DeleteObject Permission
  - If you use the `deleteFile` method from the file service, you will need this permission

**_Sample S3 Permission:_**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": ["s3:ListBucket"],
      "Effect": "Allow",
      "Principal": "*",
      "Resource": "arn:aws:s3:::your-bucket"
    },
    {
      "Action": [
        "s3:DeleteObject",
        "s3:GetObject",
        "s3:GetObjectAttributes",
        "s3:PutObject"
      ],
      "Effect": "Allow",
      "Principal": "*",
      "Resource": "arn:aws:s3:::your-bucket/*"
    }
  ]
}
```

### Register plugin

Register the fastify-s3 package with your Fastify instance, passing its options directly. The recommended pattern is still a central app config (`ApiConfig`) with an `s3` block — you derive the plugin options from it and pass them explicitly; the plugin no longer reads them from the fastify instance. The slonik plugin must be registered first (file metadata is stored in the database):

```typescript
import configPlugin from "@prefabs.tech/fastify-config";
import errorHandlerPlugin from "@prefabs.tech/fastify-error-handler";
import s3Plugin from "@prefabs.tech/fastify-s3";
import slonikPlugin from "@prefabs.tech/fastify-slonik";
import Fastify from "fastify";

import config from "./config";

const start = async () => {
  // Create fastify instance
  const fastify = Fastify({
    logger: config.logger,
  });

  // Register config plugin (decorates the app with the global config,
  // used by FileService consumers via request.config)
  await fastify.register(configPlugin, { config });

  await fastify.register(errorHandlerPlugin, {
    stackTrace: process.env.NODE_ENV === "development",
  });

  // Register database plugin (required by fastify-s3)
  await fastify.register(slonikPlugin, config.slonik);

  // Register fastify-s3 plugin, passing its config slice explicitly
  // (see below for GraphQL uploads)
  await fastify.register(s3Plugin, {
    ...config.s3,
    rest: config.rest,
  });

  await fastify.listen({
    host: "0.0.0.0",
    port: config.port,
  });
};

start();
```

Registering the plugin without options is deprecated — see [Deprecated: configuration via `fastify.config`](#deprecated-configuration-via-fastifyconfig).

## Configuration

The plugin is configured with an `S3Options` object passed directly to `register()` — typically derived from your central `ApiConfig`: the `s3` block plus the app-wide `rest` flag (`{ ...config.s3, rest: config.rest }`). The plugin itself makes no assumption that a global config exists; deriving its options from one is an app-level choice.

The `rest.enabled` flag only controls *incoming HTTP upload parsing* (it registers `@fastify/multipart`); GraphQL uploads are configured on the graphql plugin (`uploads` option). The flag may be off entirely: the plugin still runs migrations and provides a fully functional `FileService`/`S3Client` — e.g. for presigned-URL flows (clients upload directly to S3), server-generated files, or download-only services.

To initialize Client:

AWS S3 Config

```typescript
import type { ApiConfig } from "@prefabs.tech/fastify-config";

const config: ApiConfig = {
  // ... other configurations

  s3: {
    bucket: "" | { key: "value" }, // Specify your S3 bucket
    //... AWS S3 client config
    clientConfig: {
      credentials: {
        accessKeyId: "accessKey", // Replace with your AWS access key
        secretAccessKey: "secretKey", // Replace with your AWS secret key
      },
      region: "ap-southeast-1", // Replace with your AWS region
    },
  },
};

// at registration, pass the slice explicitly
await fastify.register(s3Plugin, { ...config.s3, rest: config.rest });
```

> **Credentials on EC2 (IAM Role)**
>
> If your application is running on an EC2 instance (or ECS, Lambda,
> or any AWS environment with an IAM Role attached), you do not need
> to provide AWS credentials explicitly.
>
> The AWS SDK for JavaScript automatically retrieves temporary
> credentials from the Instance Metadata Service (IMDS).
>
> As long as your EC2 instance has an IAM Role with the correct S3 permissions (e.g., s3:GetObject, s3:PutObject), the SDK will handle authentication for you.

Minio Service Config

```typescript
const config: ApiConfig = {
  // ... other configurations

  s3: {
    bucket: "yourMinioBucketName",
    clientConfig: {
      credentials: {
        accessKeyId: "yourMinioAccessKey",
        secretAccessKey: "yourMinioSecretKey",
      },
      endpoint: "http://your-minio-server-url:port", // Replace with your Minio server URL
      forcePathStyle: true, // Set to true if your Minio server uses path-style URLs
      region: "", // For Minio, you can leave the region empty or specify it based on your setup
    },
  },
};
```

To add a custom table name:

```typescript
const config: ApiConfig = {
  // ... other configurations

  s3: {
    //... AWS S3 client config
    table: {
      name: "new-table-name", // You can set a custom table name here (default: "files")
    },
  },
};
```

To limit the file size while uploading:

```typescript
const config: ApiConfig = {
  // ... other configurations

  s3: {
    //... AWS S3 client config
    fileSizeLimitInBytes: 10485760,
  },
};
```

To handle duplicate filenames:

- FilenameResolutionStrategy: This option has three choices: `override`, `add-suffix`, and `error`.
  - `error`: If you choose the error option, it will throw an error if the file name is duplicated in the S3 bucket.
  - `add-suffix`: If you choose the add-suffix option, it will append `-<number>` to the file name if it is duplicated.<br>For example, if the filename is `example.png` which is already exist on S3 bucket, the new name will be `example-1.png`.
  - `override`: This is the default option and it overrides the file if the file name already exists.

  ```typescript
  fileService.upload({
    // ... other options
    options: {
      // ... other options
      filenameResolutionStrategy: "add-suffix",
    },
  });
  ```

## Using GraphQL

This package supports integration with [@prefabs.tech/fastify-graphql](../graphql/).

GraphQL file uploads are handled entirely by the graphql plugin: when it is enabled it registers the upload transport (content-type parser + `graphql-upload-minimal` processing) before mercurius. Nothing upload-specific needs to be registered from this package:

```typescript
import graphqlPlugin from "@prefabs.tech/fastify-graphql";
import s3Plugin from "@prefabs.tech/fastify-s3";
import slonikPlugin from "@prefabs.tech/fastify-slonik";
import Fastify from "fastify";

import config from "./config";

const start = async () => {
  // Create fastify instance
  const fastify = Fastify({
    logger: config.logger,
  });

  // Register database plugin
  await fastify.register(slonikPlugin, config.slonik);

  // Register graphql plugin (registers the upload transport by default;
  // configure it with the `uploads` option)
  await fastify.register(graphqlPlugin, {
    ...config.graphql,
    uploads: { maxFileSize: 10485760 },
  });

  // Register fastify-s3 plugin AFTER the graphql plugin (required in mixed
  // REST + GraphQL mode: the @fastify/multipart parser registered by
  // rest.enabled must not leak into the graphql route's context)
  await fastify.register(s3Plugin, {
    ...config.s3,
    rest: config.rest,
  });

  await fastify.listen({
    host: "0.0.0.0",
    port: config.port,
  });
}

start();
```

**Note**: In mixed REST + GraphQL mode, always register the s3 plugin after the graphql plugin.

## JSON Schema with Swagger

If you want to use @prefabs.tech/fastify-s3 with @fastify/swagger and @fastify/swagger-ui or @prefabs.tech/swagger you must add a new type called `isFile` and use a custom instance of a validator compiler

```typescript
import graphqlPlugin from "@prefabs.tech/fastify-graphql";
import s3Plugin, { ajvFilePlugin } from "@prefabs.tech/fastify-s3";
import slonikPlugin from "@prefabs.tech/fastify-slonik";
import Fastify from "fastify";

import config from "./config";

const start = async () => {
  // Create fastify instance
  const fastify = Fastify({
    logger: config.logger,
    // ...
    ajv: {
      plugins: [ajvFilePlugin],
    },
  });

  // Register database plugin
  await fastify.register(slonikPlugin, config.slonik);

  // Register graphql plugin (upload transport included by default)
  await fastify.register(graphqlPlugin, config.graphql);

  // Register fastify-s3 plugin (after the graphql plugin)
  await fastify.register(s3Plugin, {
    ...config.s3,
    rest: config.rest,
  });

  fastify.post('/upload/file', {
    schema: {
      body: {
        properties: {
          file: { isFile: true },
        },
        type: "object",
      },
      consumes: ["multipart/form-data"],
      description: "Upload a file",
      tags: ["file"],
    }
  }, function (req, reply) {
    console.log({ body: req.body })
    reply.send('done')
  })

  await fastify.listen({
    port: config.port,
    host: "0.0.0.0",
  });
}

start();
```

## Deprecated: configuration via `fastify.config`

Earlier versions of this plugin did not take options: they read their configuration from the fastify instance (`fastify.config`, decorated by [@prefabs.tech/fastify-config](../config/)) — the S3 settings from `config.s3`, and the REST feature flag from the application-wide `config.rest` namespace. GraphQL upload support also used to live in this package (`multipartParserPlugin` + an internal upload hook); it has moved to [@prefabs.tech/fastify-graphql](../graphql/).

This approach is **deprecated**. The plugin no longer depends on `fastify.config` for its configuration; everything is passed through its own `S3Options` argument as documented above.

For backward compatibility, the old behavior is temporarily still supported:

- **Main plugin** — registering without options composes them from `fastify.config.s3` and `fastify.config.rest`, and logs a deprecation warning. If `fastify.config.s3` is missing too, registration throws.
- **`multipartParserPlugin`** — still exported, but as a thin wrapper around the upload transport from `@prefabs.tech/fastify-graphql`. It logs a deprecation warning and no-ops when the transport is already registered (which the graphql plugin does by default). Prefer the graphql plugin's `uploads` option.
- **`GraphQLUpload` / `GraphQLFileUpload` types** — still re-exported, deprecated; import them from `@prefabs.tech/fastify-graphql` instead.
- **`createFilesTableQuery`** — still accepts a full `ApiConfig` (reading `config.s3.table.name`) in addition to the new `S3Options` shape.

These fallbacks will be removed in a future release. To migrate, pass the configuration you previously kept under `config.s3` (plus the `rest` flag) directly to `register()`:

```typescript
// Before (deprecated)
await fastify.register(configPlugin, { config }); // config.s3, config.rest
await fastify.register(s3Plugin);

// After
await fastify.register(s3Plugin, {
  ...config.s3,
  rest: config.rest,
});
```
