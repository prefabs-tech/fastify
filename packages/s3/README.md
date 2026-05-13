# @prefabs.tech/fastify-s3

A [Fastify](https://github.com/fastify/fastify) plugin that provides an easy integration of S3 in a fastify API.

## Why this plugin?

Handling file uploads in a full-stack context requires substantially more effort than simply pushing byte streams to an S3 bucket via the AWS SDK. You must parse multipart requests, handle potential filename collisions securely, stream data to S3, and immediately synchronize metadata flags to your database. We created this plugin to:

- **Automate the Full Upload Lifecycle**: From intercepting `multipart/form-data` chunks (via internal parsers), writing to S3, and saving strict structured metadata natively into our `@prefabs.tech/fastify-slonik` powered databases—this plugin handles the entire flow.
- **Standardize Duplication Strategies**: It provides out-of-the-box mechanisms (`error`, `add-suffix`, `override`) to elegantly handle duplicate filenames with zero effort.
- **Bridge REST & GraphQL**: The plugin provides specialized parsers (`ajvFilePlugin` and `multipartParserPlugin`) ensuring that file uploads are supported natively and documented correctly via Swagger (for REST APIs) and GraphQL simultaneously.

### Design Decisions: Why not @aws-sdk/client-s3 and @fastify/multipart directly?

- **Too Much Boilerplate**: While those granular tools are fantastic, manually aggregating them to handle incoming parsed streams, S3 buffering, database synchronization, and Swagger schema injection per-route results in massive duplication of boilerplate code across microservices.
- **Ecosystem Homogenization**: This plugin strictly binds the AWS SDK into our ecosystem's configuration (`fastify-config`) and database architecture (`fastify-slonik`), affording you a unified `FileService` that is ready to execute uploads and metadata queries perfectly right after registration.

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

Register the file fastify-s3 package with your Fastify instance:

```typescript
import configPlugin from "@prefabs.tech/fastify-config";
import errorHandlerPlugin from "@prefabs.tech/fastify-error-handler";
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

  // Register config plugin
  await fastify.register(configPlugin, { config });

  await fastify.register(errorHandlerPlugin, {
    stackTrace: process.env.NODE_ENV === "development",
  });

  // Register database plugin
  await fastify.register(slonikPlugin, config.slonik);

  await fastify.register(graphqlPlugin, config.graphql);

  // Register fastify-s3 plugin (see below for multipartParserPlugin when using GraphQL uploads)
  await fastify.register(s3Plugin);

  await fastify.listen({
    host: "0.0.0.0",
    port: config.port,
  });
};

start();
```

## Configuration

To initialize Client:

AWS S3 Config

```typescript
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

Register additional `multipartParserPlugin` plugin with the fastify instance as shown below:

```typescript
import configPlugin from "@prefabs.tech/fastify-config";
import graphqlPlugin from "@prefabs.tech/fastify-graphql";
import s3Plugin, { multipartParserPlugin } from "@prefabs.tech/fastify-s3";
import slonikPlugin from "@prefabs.tech/fastify-slonik";
import Fastify from "fastify";

import config from "./config";

const start = async () => {
  // Create fastify instance
  const fastify = Fastify({
    logger: config.logger,
  });

  // Register config plugin
  await fastify.register(configPlugin, { config });

  // Register database plugin
  await fastify.register(slonikPlugin, config.slonik);

  // Register multipart content-type parser plugin (required for graphql file upload or if using both graphql and rest file upload)
  await fastify.register(multipartParserPlugin);

  // Register graphql plugin
  await fastify.register(graphqlPlugin, config.graphql);

  // Register fastify-s3 plugin
  await fastify.register(s3Plugin);

  await await.listen({
    host: "0.0.0.0",
    port: config.port,
  });
}

start();
```

**Note**: Register the `multipartParserPlugin` if you're using GraphQL or both GraphQL and REST, as it's required. Make sure to place the registration of the `multipartParserPlugin` above the `graphqlPlugin`.

## JSON Schema with Swagger

If you want to use @prefabs.tech/fastify-s3 with @fastify/swagger and @fastify/swagger-ui or @prefabs.tech/swagger you must add a new type called `isFile` and use a custom instance of a validator compiler

```typescript
import configPlugin from "@prefabs.tech/fastify-config";
import graphqlPlugin from "@prefabs.tech/fastify-graphql";
import s3Plugin, {
  ajvFilePlugin,
  multipartParserPlugin,
} from "@prefabs.tech/fastify-s3";
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

  // Register config plugin
  await fastify.register(configPlugin, { config });

  // Register database plugin
  await fastify.register(slonikPlugin, config.slonik);

  // Register multipart content-type parser plugin (required for graphql file upload or if using both graphql and rest file upload)
  await fastify.register(multipartParserPlugin);

  // Register graphql plugin
  await fastify.register(graphqlPlugin, config.graphql);

  // Register fastify-s3 plugin
  await fastify.register(s3Plugin);

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

  await await.listen({
    port: config.port,
    host: "0.0.0.0",
  });
}

start();
```
