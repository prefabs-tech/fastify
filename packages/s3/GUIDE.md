# @prefabs.tech/fastify-s3 — Developer Guide

## Installation

### For package consumers (npm + pnpm)

```bash
# npm
npm install @prefabs.tech/fastify-s3

# pnpm
pnpm add @prefabs.tech/fastify-s3
```

Peer dependencies that must be installed alongside this package:

```bash
pnpm add fastify fastify-plugin slonik zod \
  @prefabs.tech/fastify-config \
  @prefabs.tech/fastify-error-handler \
  @prefabs.tech/fastify-graphql \
  @prefabs.tech/fastify-slonik
```

### For monorepo development (pnpm install / test / build)

```bash
# From the repo root
pnpm install

# Run tests for this package only
pnpm --filter @prefabs.tech/fastify-s3 test

# Build
pnpm --filter @prefabs.tech/fastify-s3 build
```

---

## Setup

Register the plugin once. All later examples assume this setup is already in place.

```typescript
import Fastify from "fastify";
import fastifyPlugin from "fastify-plugin";
import s3Plugin, { ajvFilePlugin } from "@prefabs.tech/fastify-s3";

// Extend ApiConfig so TypeScript knows about config.s3
// (the module augmentation in index.ts handles this automatically when you import the package)
import "@prefabs.tech/fastify-s3";

const fastify = Fastify({
  ajv: {
    plugins: [ajvFilePlugin], // enable isFile keyword in route schemas
  },
});

// Register config plugin first (fastify-config peer dep)
await fastify.register(configPlugin, {
  s3: {
    clientConfig: {
      region: "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    },
    bucket: "my-app-uploads",
    fileSizeLimitInBytes: 10 * 1024 * 1024, // 10 MB
    filenameResolutionStrategy: "add-suffix",
    table: { name: "files" }, // optional, "files" is the default
  },
  rest: { enabled: true },
  graphql: { enabled: false },
});

// Register slonik plugin (peer dep) before s3 plugin
await fastify.register(slonikPlugin);

// Register the S3 plugin
await fastify.register(s3Plugin);

await fastify.listen({ port: 3000 });
```

---

## Base Libraries

### `@aws-sdk/client-s3` — Partial Passthrough

Official docs: https://www.npmjs.com/package/@aws-sdk/client-s3

The `S3Client` class in this package wraps the AWS SDK `S3Client`. The raw `S3ClientConfig` type is re-exported for consumers that need it. Commands (`GetObjectCommand`, `DeleteObjectCommand`, `ListObjectsCommand`, `HeadObjectCommand`) are used internally and are not exposed directly. We add:

- A mutable `bucket` property on the class so one instance can target multiple buckets.
- `get`, `upload`, `delete`, `getObjects`, `isFileExists`, and `generatePresignedUrl` convenience methods (see the S3Client section below).

### `@aws-sdk/lib-storage` — Full Passthrough

Official docs: https://www.npmjs.com/package/@aws-sdk/lib-storage

`Upload` is used internally inside `S3Client.upload` to support multipart S3 uploads. No API surface from this library is exposed to consumers.

### `@aws-sdk/s3-request-presigner` — Full Passthrough

Official docs: https://www.npmjs.com/package/@aws-sdk/s3-request-presigner

`getSignedUrl` is used internally inside `S3Client.generatePresignedUrl`. Not exposed directly.

### `@fastify/multipart` — Modified

Official docs: https://www.npmjs.com/package/@fastify/multipart

Registered automatically (when `config.rest.enabled` is `true`) with a fixed configuration:

- `attachFieldsToBody: "keyValues"` — non-file fields are attached directly to `req.body`.
- `sharedSchemaId: "fileSchema"` — registers the file JSON schema under this id.
- `limits.fileSize` set from `config.s3.fileSizeLimitInBytes`.
- An `onFile` hook converts each multipart file part into a `Multipart` object (`{ data: Buffer, encoding, filename, mimetype }`) before route handlers run.

Consumers cannot change these options through this plugin; register `@fastify/multipart` manually if custom options are needed.

### `graphql-upload-minimal` — Partial Passthrough

Official docs: https://www.npmjs.com/package/graphql-upload-minimal

`processRequest` and `UploadOptions` are used in the internal `graphqlUpload` plugin. The `FileUpload` and `Upload` types are re-exported as `GraphQLFileUpload` and `GraphQLUpload`. We add a `preValidation` hook that calls `processRequest` only when `req.graphqlFileUploadMultipart` is `true` (set by `multipartParserPlugin`).

### `busboy` — Full Passthrough

Official docs: https://www.npmjs.com/package/busboy

Used internally in `processMultipartFormData` (called by `multipartParserPlugin`) to parse multipart bodies outside the GraphQL path. Not exposed to consumers.

### `uuid` — Full Passthrough

Official docs: https://www.npmjs.com/package/uuid

`uuidv4()` is used inside `FileService` to generate fallback filenames. Not exposed to consumers.

---

## Features

### 1 — Main plugin registration

Import the default export and register it with Fastify. The plugin uses `fastify-plugin` so decorators are not scoped.

```typescript
import s3Plugin from "@prefabs.tech/fastify-s3";

await fastify.register(s3Plugin);
// Runs DB migration, registers multipart (if REST enabled),
// registers GraphQL upload hook (if GraphQL enabled).
```

### 2 — Automatic database migration

On every registration the plugin issues `CREATE TABLE IF NOT EXISTS` for the files table. No manual migration command is needed. The table name comes from `config.s3.table.name` (default `"files"`).

### 3 — Conditional REST multipart

When `config.rest.enabled` is `true`, `@fastify/multipart` is registered automatically. File parts are available on `req.body` as `Multipart` objects.

```typescript
// config
rest: {
  enabled: true;
}

// Route — file is ready as a Multipart object on req.body
fastify.post(
  "/upload",
  {
    schema: {
      body: {
        type: "object",
        properties: {
          file: { isFile: true }, // single file
          attachments: {
            // array of files
            type: "array",
            items: { isFile: true },
          },
        },
        required: ["file"],
      },
    },
  },
  async (request) => {
    const { file } = request.body as { file: Multipart };
    // file.data is a Buffer, file.filename, file.mimetype are strings
  },
);
```

### 4 — Conditional GraphQL upload registration

When `config.graphql?.enabled` is `true`, the plugin registers a `preValidation` hook that calls `processRequest` from `graphql-upload-minimal` for multipart GraphQL requests. You must also register `multipartParserPlugin` to set the `graphqlFileUploadMultipart` flag.

```typescript
// config
graphql: { enabled: true, path: "/graphql" }

// Also register multipartParserPlugin (see Feature 8)
await fastify.register(multipartParserPlugin);
await fastify.register(s3Plugin);
```

### 5 — `S3Config` configuration shape

Provide `s3` inside the config plugin options:

```typescript
import type { S3Config } from "@prefabs.tech/fastify-s3";

const s3Config: S3Config = {
  clientConfig: {
    region: "eu-west-1",
    credentials: {
      accessKeyId: "AKIA...",
      secretAccessKey: "...",
    },
  },
  bucket: "primary-bucket", // or { avatars: "avatars-bucket", docs: "docs-bucket" }
  fileSizeLimitInBytes: 5 * 1024 * 1024, // 5 MB
  filenameResolutionStrategy: "add-suffix",
  table: { name: "uploaded_files" },
};
```

### 6 — Module augmentation of `@prefabs.tech/fastify-config`

Importing `@prefabs.tech/fastify-s3` automatically extends `ApiConfig` with the `s3` key. No manual interface merging is required.

```typescript
import "@prefabs.tech/fastify-s3"; // side-effect: augments ApiConfig

// Now TypeScript knows about fastify.config.s3
const bucket = fastify.config.s3.bucket;
```

### 7 — `ajvFilePlugin` — custom `isFile` AJV keyword

Pass the plugin to Fastify's AJV options to enable the `isFile` keyword in route body schemas.

```typescript
import Fastify from "fastify";
import { ajvFilePlugin } from "@prefabs.tech/fastify-s3";

const fastify = Fastify({
  ajv: { plugins: [ajvFilePlugin] },
});

// Use in a route schema:
fastify.post("/upload", {
  schema: {
    body: {
      type: "object",
      properties: {
        document: { isFile: true },
        images: { type: "array", items: { isFile: true } },
      },
    },
  },
  handler: async (request) => {
    /* ... */
  },
});
```

At runtime, `isFile: true` validates that the value has `data`, `filename`, and `mimetype` properties. It also rewrites the schema to `{ type: "string", format: "binary" }` so Swagger UI renders a file picker.

### 8 — `multipartParserPlugin` — catch-all content-type parser

Register this plugin when your application handles both GraphQL file uploads and REST file uploads, or whenever you need busboy-based multipart parsing outside of `@fastify/multipart`.

```typescript
import { multipartParserPlugin } from "@prefabs.tech/fastify-s3";

await fastify.register(multipartParserPlugin);
```

For multipart requests to the GraphQL path, it sets `req.graphqlFileUploadMultipart = true` (the `graphqlUpload` preValidation hook checks this flag). For all other multipart requests it parses the body via Busboy and attaches fields and files to `req.body`.

### 9 — `S3Client` class

Use `S3Client` directly when you need raw S3 access outside the `FileService` abstraction.

```typescript
import { S3Client } from "@prefabs.tech/fastify-s3";
import type { S3ClientConfig } from "@prefabs.tech/fastify-s3";

const clientConfig: S3ClientConfig = {
  region: "us-east-1",
  credentials: { accessKeyId: "...", secretAccessKey: "..." },
};

const client = new S3Client(clientConfig);
client.bucket = "my-bucket";
```

### 10 — `S3Client.upload`

```typescript
import { ReadStream, createReadStream } from "node:fs";

// Upload from a Buffer
const buffer = Buffer.from("hello world");
await client.upload(buffer, "path/to/hello.txt", "text/plain");

// Upload from a ReadStream
const stream: ReadStream = createReadStream("/tmp/photo.jpg");
await client.upload(stream, "images/photo.jpg", "image/jpeg");
```

### 11 — `S3Client.get`

```typescript
const { Body, ContentType } = await client.get("path/to/hello.txt");
// Body is a Buffer, ContentType is e.g. "text/plain"
```

### 12 — `S3Client.delete`

```typescript
const output = await client.delete("path/to/hello.txt");
// output is DeleteObjectCommandOutput
```

### 13 — `S3Client.generatePresignedUrl`

```typescript
// Default expiry: 3600 seconds
const url = await client.generatePresignedUrl(
  "uploads/report.pdf",
  "Q3 Report.pdf",
);

// Custom expiry: 15 minutes
const shortUrl = await client.generatePresignedUrl(
  "uploads/report.pdf",
  "Q3 Report.pdf",
  900,
);
```

The URL includes `Content-Disposition: attachment; filename="<originalFileName>"` so browsers trigger a download.

### 14 — `S3Client.getObjects`

```typescript
const result = await client.getObjects("uploads/2024/");
// result.Contents lists all keys with that prefix
```

### 15 — `S3Client.isFileExists`

```typescript
const exists = await client.isFileExists("uploads/photo.jpg");
if (exists) {
  console.log("File is already in S3");
}
```

Returns `false` for `NotFound` errors and re-throws any other error.

### 16 — `FileService` class

`FileService` extends `BaseService` and inherits its full CRUD interface. Construct it with the Fastify `config` and a Slonik `database` connection.

```typescript
import { FileService } from "@prefabs.tech/fastify-s3";

// Typically constructed inside a route or service layer:
const service = new FileService({
  config: fastify.config,
  database: fastify.slonik,
});
```

### 17 — `FileService.upload`

```typescript
import type { FilePayload } from "@prefabs.tech/fastify-s3";

const payload: FilePayload = {
  file: {
    fileContent: {
      data: Buffer.from("..."),
      filename: "report.pdf",
      mimetype: "application/pdf",
    },
    fileFields: {
      bucket: "docs-bucket",
      uploadedAt: Date.now(),
      uploadedById: "user-123",
    },
  },
  options: {
    path: "reports/2024",
    filenameResolutionStrategy: "add-suffix", // overrides config-level default
  },
};

const file = await service.upload(payload);
// file contains the persisted DB record including id, key, originalFileName, etc.
```

### 18 — `FileService.download`

```typescript
const result = await service.download(42);
// result.fileStream is a Buffer of the file's raw bytes
// result.mimeType is the Content-Type from S3
// ...plus all columns from the files table

// With an explicit bucket override:
const result2 = await service.download(42, { bucket: "archive-bucket" });
```

### 19 — `FileService.deleteFile`

```typescript
await service.deleteFile(42);
// Removes the DB record first, then deletes the S3 object.

// Override bucket if stored metadata bucket is stale:
await service.deleteFile(42, { bucket: "old-bucket" });
```

### 20 — `FileService.presignedUrl`

```typescript
import type { PresignedUrlOptions } from "@prefabs.tech/fastify-s3";

const options: PresignedUrlOptions = {
  signedUrlExpiresInSecond: 1800, // 30 minutes; default 3600
};

const result = await service.presignedUrl(42, options);
console.log(result.url); // https://s3.amazonaws.com/...
```

### 21 — `FileService.key` computed property

The S3 object key is built from `<path>/<filename>`. A trailing `/` is added to `path` automatically if absent.

```typescript
service.path = "images/avatars";
service.filename = "user-99.jpg";
console.log(service.key); // "images/avatars/user-99.jpg"

service.path = "images/avatars/"; // already has trailing slash
console.log(service.key); // "images/avatars/user-99.jpg"
```

### 22 — `FileService.filename` UUID fallback

When `filename` has not been set on the service, the getter generates a UUID-based name:

```typescript
service.fileExtension = "png";
// service.filename not set
console.log(service.filename); // e.g. "550e8400-e29b-41d4-a716-446655440000.png"

// Explicit filename without extension — extension appended automatically:
service.filename = "avatar";
service.fileExtension = "png";
console.log(service.filename); // "avatar.png"
```

### 23 — `FileSqlFactory` and configurable table name

`FileSqlFactory` overrides the `table` getter from `DefaultSqlFactory` to respect `config.s3.table.name`. You generally do not instantiate this directly — `FileService` uses it internally.

```typescript
// config.s3.table.name = "uploaded_files"
// All FileService queries will target "uploaded_files" instead of "files"
```

### 24 — `convertStreamToBuffer`

Internal utility also exported for use in custom code:

```typescript
import { Readable } from "node:stream";
import { convertStreamToBuffer } from "@prefabs.tech/fastify-s3"; // not exported — use via S3Client.get

// Not directly exported; available via S3Client.get which calls it internally.
```

Note: `convertStreamToBuffer` is not in the public export surface. Use `S3Client.get` which calls it internally, or implement your own if you need standalone stream-to-buffer conversion.

### 25 — `getPreferredBucket` utility

Controls which bucket wins when both `options.bucket` and `fileFields.bucket` are provided:

```typescript
// Explicit bucketChoice
options: {
  bucket: "archive",
  bucketChoice: "optionsBucket",  // "archive" wins
}

options: {
  bucketChoice: "fileFieldsBucket",  // fileFields.bucket wins
}

// No bucketChoice — fileFields.bucket takes precedence when both present
options: {
  bucket: "archive",
  // no bucketChoice
}
// fileFields.bucket wins if set
```

### 26 — `getFilenameWithSuffix` — add-suffix strategy detail

When `filenameResolutionStrategy` is `"add-suffix"` and a collision is found, the service lists existing S3 objects with the same base name and picks the next numeric suffix:

```
Existing keys: report.pdf, report-1.pdf, report-2.pdf
→ New key:     report-3.pdf
```

### 27 / 28 — `getBaseName` and `getFileExtension`

Internally used to split filenames before applying suffix logic. Not part of the public exports.

### 29 — `createFilesTableQuery` migration query

Exported for consumers who manage their own migration tooling:

```typescript
import { createFilesTableQuery } from "@prefabs.tech/fastify-s3";

const query = createFilesTableQuery(config);
await database.connect(async (conn) => conn.query(query));
```

### 30 — `ERROR_CODES.FILE_NOT_FOUND`

```typescript
import { ERROR_CODES } from "@prefabs.tech/fastify-s3";

try {
  await service.download(999);
} catch (err: unknown) {
  if (err instanceof CustomError && err.code === ERROR_CODES.FILE_NOT_FOUND) {
    reply.status(404).send({ error: "File not found" });
  }
}
```

### 31 — `ERROR_CODES.FILE_ALREADY_EXISTS_IN_S3`

```typescript
import { ERROR_CODES } from "@prefabs.tech/fastify-s3";

// config.s3.filenameResolutionStrategy = "error"
try {
  await service.upload(payload);
} catch (err: unknown) {
  if (
    err instanceof CustomError &&
    err.code === ERROR_CODES.FILE_ALREADY_EXISTS_IN_S3
  ) {
    reply.status(409).send({ error: "A file with that name already exists" });
  }
}
```

### 32–41 — Type exports

All types are importable from the package root:

```typescript
import type {
  S3Config,
  FilePayload,
  FilePayloadOptions,
  Multipart,
  FilenameResolutionStrategy,
  BucketChoice,
  File,
  FileCreateInput,
  FileUpdateInput,
  GraphQLFileUpload,
  GraphQLUpload,
  S3ClientConfig,
} from "@prefabs.tech/fastify-s3";
```

---

## Use Cases

### Use Case 1 — REST file upload with route validation

Accept a single file via a REST endpoint and store it in S3, persisting metadata to the database.

```typescript
import Fastify from "fastify";
import s3Plugin, { ajvFilePlugin, FileService } from "@prefabs.tech/fastify-s3";
import type { Multipart, FilePayload } from "@prefabs.tech/fastify-s3";

const fastify = Fastify({ ajv: { plugins: [ajvFilePlugin] } });
// ... register config, slonik, then s3Plugin ...

fastify.post<{
  Body: { document: Multipart; description: string };
}>(
  "/documents",
  {
    schema: {
      body: {
        type: "object",
        properties: {
          document: { isFile: true },
          description: { type: "string" },
        },
        required: ["document"],
      },
    },
  },
  async (request, reply) => {
    const { document, description } = request.body;

    const service = new FileService({
      config: fastify.config,
      database: fastify.slonik,
    });

    const payload: FilePayload = {
      file: {
        fileContent: document,
        fileFields: {
          description,
          uploadedAt: Date.now(),
          uploadedById: request.user?.id,
        },
      },
      options: {
        path: "documents",
      },
    };

    const file = await service.upload(payload);
    return reply.status(201).send(file);
  },
);
```

### Use Case 2 — Multiple bucket routing per upload type

Use a named-bucket map and `bucketChoice` to route different file types to different buckets.

```typescript
// Config
s3: {
  clientConfig: { region: "us-east-1", credentials: { ... } },
  bucket: {
    avatars: "my-app-avatars",
    documents: "my-app-docs",
  },
}

// Upload handler — avatar goes to avatars bucket
const payload: FilePayload = {
  file: {
    fileContent: avatarFile,
    fileFields: {
      bucket: fastify.config.s3.bucket["avatars"],
      uploadedAt: Date.now(),
    },
  },
  options: {
    bucketChoice: "fileFieldsBucket",
    path: `users/${userId}/avatar`,
  },
};
const record = await service.upload(payload);
```

### Use Case 3 — Generating a time-limited download URL

Return a presigned URL so the client can download a file directly from S3 without proxying through your server.

```typescript
fastify.get<{ Params: { id: string } }>(
  "/files/:id/download-url",
  async (request, reply) => {
    const service = new FileService({
      config: fastify.config,
      database: fastify.slonik,
    });

    const { url } = await service.presignedUrl(Number(request.params.id), {
      signedUrlExpiresInSecond: 300, // 5 minutes
    });

    return reply.send({ url });
  },
);
```

### Use Case 4 — Streaming a file back through the server

Retrieve the raw bytes from S3 and send them in the response.

```typescript
fastify.get<{ Params: { id: string } }>(
  "/files/:id",
  async (request, reply) => {
    const service = new FileService({
      config: fastify.config,
      database: fastify.slonik,
    });

    const { fileStream, mimeType, originalFileName } = await service.download(
      Number(request.params.id),
    );

    return reply
      .header("Content-Type", mimeType ?? "application/octet-stream")
      .header(
        "Content-Disposition",
        `attachment; filename="${originalFileName}"`,
      )
      .send(fileStream);
  },
);
```

### Use Case 5 — Deleting a file

Remove both the S3 object and the database record in one call.

```typescript
fastify.delete<{ Params: { id: string } }>(
  "/files/:id",
  async (request, reply) => {
    const service = new FileService({
      config: fastify.config,
      database: fastify.slonik,
    });

    await service.deleteFile(Number(request.params.id));
    return reply.status(204).send();
  },
);
```

### Use Case 6 — GraphQL file upload

Enable GraphQL multipart support and handle file uploads in a GraphQL mutation.

```typescript
// Registration (order matters)
await fastify.register(configPlugin, {
  s3: { clientConfig: { ... }, bucket: "uploads", fileSizeLimitInBytes: 10_000_000 },
  rest: { enabled: false },
  graphql: { enabled: true, path: "/graphql" },
});
await fastify.register(slonikPlugin);
await fastify.register(multipartParserPlugin); // must come before s3Plugin
await fastify.register(s3Plugin);
await fastify.register(graphqlPlugin);         // your Mercurius/graphql plugin

// GraphQL resolver
const resolvers = {
  Mutation: {
    uploadFile: async (_: unknown, args: { file: GraphQLUpload }) => {
      const { createReadStream, filename, mimetype } = await args.file;

      const service = new FileService({ config: fastify.config, database: fastify.slonik });

      return service.upload({
        file: {
          fileContent: {
            data: createReadStream(),
            filename,
            mimetype,
          },
          fileFields: { uploadedAt: Date.now() },
        },
      });
    },
  },
};
```

### Use Case 7 — Collision-safe uploads with automatic suffix

Configure `filenameResolutionStrategy: "add-suffix"` globally and upload files whose names may collide.

```typescript
// Config
s3: {
  clientConfig: { ... },
  bucket: "reports",
  filenameResolutionStrategy: "add-suffix",
}

// First upload → stored as "annual-report.pdf"
// Second upload of same name → stored as "annual-report-1.pdf"
// Third → "annual-report-2.pdf", etc.
const service = new FileService({ config: fastify.config, database: fastify.slonik });

await service.upload({
  file: {
    fileContent: { data: pdfBuffer, filename: "annual-report.pdf", mimetype: "application/pdf" },
    fileFields: { uploadedAt: Date.now() },
  },
});
```

### Use Case 8 — Using `S3Client` directly

Bypass `FileService` for ad-hoc S3 operations (e.g. listing objects, checking existence) without database involvement.

```typescript
import { S3Client } from "@prefabs.tech/fastify-s3";

const client = new S3Client(fastify.config.s3.clientConfig);
client.bucket = "my-bucket";

// Check before uploading
const exists = await client.isFileExists("exports/data.csv");
if (!exists) {
  await client.upload(csvBuffer, "exports/data.csv", "text/csv");
}

// List all exports
const { Contents } = await client.getObjects("exports/");
const keys = Contents?.map((obj) => obj.Key) ?? [];
```

### Use Case 9 — Custom migration integration

Run the migration query inside your own migration pipeline instead of relying on the automatic plugin startup migration.

```typescript
import { createFilesTableQuery } from "@prefabs.tech/fastify-s3";

// Inside your custom migration runner:
await database.connect(async (connection) => {
  await connection.query(createFilesTableQuery(config));
});
```
