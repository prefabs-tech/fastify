# @prefabs.tech/fastify-s3

A [Fastify](https://github.com/fastify/fastify) plugin that provides an easy integration of S3 in a fastify API.

## Requirements

* [@prefabs.tech/fastify-config](../config/)
* [@prefabs.tech/fastify-slonik](../slonik/)

## Installation

Install with npm:

```bash
npm install @prefabs.tech/fastify-config @prefabs.tech/fastify-slonik @prefabs.tech/fastify-s3
```

Install with pnpm:

```bash
pnpm add --filter "@scope/project" @prefabs.tech/fastify-config @prefabs.tech/fastify-slonik @prefabs.tech/fastify-s3
```

## Usage

### Permission

When using AWS S3, you are required to enable the following permissions:

***Required Permission:***

- GetObject Permission
- GetObjectAttributes Permission
- PutObject Permission

***Optional Permissions:***

- ListBucket Permission
  - If you choose the `add-suffix` option for FilenameResolutionStrategy when dealing with duplicate files, then you have to enable this permission.
- DeleteObject Permission
  - If you use the `deleteFile` method from the file service, you will need this permission


***Sample S3 Permission:***

```json
  {
      "Version": "2012-10-17",
      "Statement": [
          {
              "Effect": "Allow",
               "Principal": "*",
              "Action": [
                  "s3:ListBucket"
              ],
              "Resource": "arn:aws:s3:::your-bucket"
          },
          {
              "Effect": "Allow",
              "Principal": "*",
              "Action": [
                  "s3:DeleteObject",
                  "s3:GetObject",
                  "s3:GetObjectAttributes",
                  "s3:PutObject"
              ],
              "Resource": "arn:aws:s3:::your-bucket/*"
          }
      ]
  }
```

### Register plugin

Register the file fastify-s3 package with your Fastify instance:

```typescript
import configPlugin from "@prefabs.tech/fastify-config";
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
  
  // Register fastify-s3 plugin
  await fastify.register(s3Plugin);
  
  await fastify.listen({
    port: config.port,
    host: "0.0.0.0",
  });
}

start();
```

## Configuration

To initialize Client:

AWS S3 Config

```typescript
const config: ApiConfig = {
  // ... other configurations
  
  s3: {
    //... AWS S3 settings
    accessKey: "accessKey",   // Replace with your AWS access key
    secretKey: "secretKey",   // Replace with your AWS secret key
    bucket: "" | { key: "value" }, // Specify your S3 bucket
    region: "ap-southeast-1" // Replace with your AWS region
  }
};
```

Minio Service Config

```typescript
const config: ApiConfig = {
  // ... other configurations
  
  s3: {
    accessKey: "yourMinioAccessKey",
    secretKey: "yourMinioSecretKey",
    bucket: "yourMinioBucketName",
    endpoint: "http://your-minio-server-url:port", // Replace with your Minio server URL
    forcePathStyle: true, // Set to true if your Minio server uses path-style URLs
    region: "" // For Minio, you can leave the region empty or specify it based on your setup
  }
};

```

To add a custom table name:

```typescript
const config: ApiConfig = {
  // ... other configurations
  
  s3: {
    //... AWS S3 settings
    table: {
        name: "new-table-name" // You can set a custom table name here (default: "files")
    }
  }
};

```

To limit the file size while uploading:

```typescript
const config: ApiConfig = {
  // ... other configurations
  
  s3: {
    //... AWS S3 settings
    fileSizeLimitInBytes: 10485760
  }
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
    port: config.port,
    host: "0.0.0.0",
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
      description: "Upload a file",
      tags: ["file"],
      consumes: ["multipart/form-data"],
      body: {
        type: "object",
        properties: {
          file: { isFile: true },
        },
      },
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
