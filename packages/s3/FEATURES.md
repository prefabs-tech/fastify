<!-- Structured feature inventory — used by automated test generation. Developer docs: see GUIDE.md -->

# Features: @prefabs.tech/fastify-s3

## Plugin Registration

1. **Main plugin (`default` export)** — Fastify plugin wrapped with `fastify-plugin`. On registration it runs database migrations, conditionally registers `@fastify/multipart` (when `config.rest.enabled` is `true`), and conditionally registers GraphQL upload support (when `config.graphql?.enabled` is `true`).

2. **Automatic database migration** — On registration the plugin creates (if not exists) the files table using the configured table name (`config.s3.table.name`) or the default name `"files"`.

3. **Conditional REST multipart registration** — When `config.rest.enabled` is `true`, `@fastify/multipart` is registered with `attachFieldsToBody: "keyValues"`, a shared schema id of `"fileSchema"`, a file-size limit from `config.s3.fileSizeLimitInBytes` (defaults to `Infinity`), and an `onFile` hook that converts every part to a `{ data, encoding, filename, mimetype }` object and attaches it as the field value.

4. **Conditional GraphQL upload registration** — When `config.graphql?.enabled` is `true`, the internal `graphqlUpload` plugin is registered, passing `maxFileSize` from `config.s3.fileSizeLimitInBytes` (defaults to `Infinity`).

## Configuration

5. **`S3Config` interface** — Defines the `s3` key required inside `ApiConfig`:
   - `clientConfig: S3ClientConfig` — passed straight to the AWS SDK `S3Client` constructor.
   - `bucket: string | Record<string, string>` — default bucket or named-bucket map.
   - `fileSizeLimitInBytes?: number` — optional global file-size cap applied to both REST and GraphQL upload paths.
   - `filenameResolutionStrategy?: "overwrite" | "add-suffix" | "error"` — global default strategy when a key collision is detected in S3.
   - `table?: { name?: string }` — overrides the default `"files"` table name.

6. **Module augmentation of `@prefabs.tech/fastify-config`** — Adds `s3: S3Config` to the `ApiConfig` interface so the config is accessible via `fastify.config.s3` throughout the application.

## Sub-plugins (independently exportable)

7. **`ajvFilePlugin`** — AJV keyword plugin that registers the `isFile` custom keyword. Schemas using `isFile: true` validate that the value is a multipart file object (`{ data, filename, mimetype }`). For array schemas it validates every element. During compile the keyword also rewrites the parent schema (`type: "string"`, `format: "binary"`) so OpenAPI tooling renders a proper file-upload schema.

8. **`multipartParserPlugin`** — Fastify plugin that registers a catch-all `"*"` content-type parser. For multipart requests it routes GraphQL-multipart requests (matching the configured GraphQL path) by setting `req.graphqlFileUploadMultipart = true`, while all other multipart requests are parsed immediately with Busboy into `{ fields..., files... }` and stored on `req.body`. Non-multipart content types fall through unchanged. Augments `FastifyRequest` with the optional `graphqlFileUploadMultipart?: boolean` property.

## `S3Client` Utility Class

9. **`S3Client` class** — Thin class wrapper around `@aws-sdk/client-s3`. Constructed with an `S3ClientConfig`. Exposes a mutable `bucket` property so a single instance can be reused across different buckets.

10. **`S3Client.upload(fileStream, key, mimetype)`** — Uploads a `Buffer` or `ReadStream` to the configured bucket using `@aws-sdk/lib-storage` `Upload` (supports multipart uploads). Returns `AbortMultipartUploadCommandOutput | CompleteMultipartUploadCommandOutput`.

11. **`S3Client.get(filePath)`** — Downloads an object and returns `{ Body: Buffer, ContentType: string | undefined }`. The response stream is consumed internally and converted to a `Buffer` via `convertStreamToBuffer`.

12. **`S3Client.delete(filePath)`** — Sends a `DeleteObjectCommand` and returns `DeleteObjectCommandOutput`.

13. **`S3Client.generatePresignedUrl(filePath, originalFileName, signedUrlExpiresInSecond?)`** — Generates a `GetObject` presigned URL that forces `Content-Disposition: attachment; filename="<originalFileName>"`. Default expiry is `3600` seconds.

14. **`S3Client.getObjects(baseName)`** — Lists all objects in the bucket whose key starts with the given prefix. Returns `ListObjectsCommandOutput`.

15. **`S3Client.isFileExists(key)`** — Uses `HeadObjectCommand` to check existence. Returns `true` if the object exists, `false` on a `NotFound` error, and re-throws all other errors.

## `FileService` (Database + S3 Coordinator)

16. **`FileService` class** — Extends `BaseService` from `@prefabs.tech/fastify-slonik`. Coordinates S3 operations with database persistence using the `files` table (or the configured table name).

17. **`FileService.upload(data: FilePayload)`** — Full upload pipeline:
    - Determines the target bucket via `getPreferredBucket` (respects `bucketChoice: "optionsBucket" | "fileFieldsBucket"` or falls back to whichever bucket is set).
    - Checks if the key already exists in S3 (`isFileExists`).
    - Applies `filenameResolutionStrategy`: `"error"` throws `FILE_ALREADY_EXISTS_IN_S3_ERROR`; `"add-suffix"` lists existing objects with the same base name and appends the next numeric suffix (e.g. `report-2.pdf`); `"overwrite"` proceeds without modification.
    - Falls back to a UUID-based filename when no name is provided.
    - Persists the record to the database via `BaseService.create`.

18. **`FileService.download(id, options?)`** — Looks up the file record by ID (throws `FILE_NOT_FOUND_ERROR` if missing), retrieves the S3 object, and returns the file record merged with `{ fileStream: Buffer, mimeType: string }`.

19. **`FileService.deleteFile(fileId, options?)`** — Looks up the file record (throws `FILE_NOT_FOUND_ERROR` if missing), deletes the database record, then deletes the S3 object.

20. **`FileService.presignedUrl(id, options: PresignedUrlOptions)`** — Looks up the file record (throws `FILE_NOT_FOUND_ERROR` if missing) and returns the record merged with `{ url: string }` — the presigned download URL.

21. **`FileService.key` (computed property)** — Builds the S3 object key as `<path>/<filename>`, normalising the trailing slash on `path`.

22. **`FileService.filename` (computed property with UUID fallback)** — Returns the configured filename (adding the extension if missing), or a `uuid-v4.ext` name when no filename is set.

## `FileSqlFactory`

23. **`FileSqlFactory`** — Extends `DefaultSqlFactory` from `@prefabs.tech/fastify-slonik`. Overrides the `table` getter to return `config.s3.table.name` when set, falling back to the static default `"files"`.

## Utility Functions

24. **`convertStreamToBuffer(stream)`** — Internal utility used by `S3Client.get` to consume a `Readable` stream and resolve a single concatenated `Buffer` (not exported from the package root).

25. **`getPreferredBucket(optionsBucket?, fileFieldsBucket?, bucketChoice?)`** — Determines which bucket to use. With explicit `bucketChoice` the named bucket wins; without it, `fileFieldsBucket` takes precedence over `optionsBucket` when both are present.

26. **`getFilenameWithSuffix(listObjects, baseFilename, fileExtension)`** — Scans existing S3 object keys matching `<baseFilename>-<N>.<ext>`, finds the maximum `N`, and returns `<baseFilename>-<N+1>.<ext>`.

27. **`getBaseName(filename)`** — Strips the last extension from a filename string.

28. **`getFileExtension(filename)`** — Extracts the extension (without dot) from a filename string. Returns `""` for extensionless filenames.

## Database Schema (Auto-migrated)

29. **`createFilesTableQuery(config)`** — Returns a `CREATE TABLE IF NOT EXISTS` SQL query for the files table with columns: `id`, `original_file_name`, `bucket`, `description`, `key`, `uploaded_by_id`, `uploaded_at`, `download_count` (default `0`), `last_downloaded_at`, `created_at`, `updated_at`. Table name comes from `config.s3.table.name` or defaults to `"files"`.

## Error Codes

30. **`ERROR_CODES.FILE_NOT_FOUND`** (`"FILE_NOT_FOUND_ERROR"`) — Thrown by `FileService.download`, `presignedUrl`, and `deleteFile` when the requested file ID is not found in the database.

31. **`ERROR_CODES.FILE_ALREADY_EXISTS_IN_S3`** (`"FILE_ALREADY_EXISTS_IN_S3_ERROR"`) — Thrown by `FileService.upload` when a key collision is detected and `filenameResolutionStrategy` is `"error"`.

## Type Exports

32. **`S3Config`** — Plugin configuration shape (see Feature 5).

33. **`FilePayload`** — Input type for `FileService.upload`, containing `{ file: { fileContent: Multipart, fileFields: FileCreateInput }, options?: FilePayloadOptions }`.

34. **`FilePayloadOptions`** — Upload options: `bucket?`, `bucketChoice?`, `filenameResolutionStrategy?`, `path?`.

35. **`Multipart`** — Normalised multipart file object: `{ data: Buffer | ReadStream, encoding?, filename, limit?, mimetype }`.

36. **`FilenameResolutionStrategy`** — Union type `"overwrite" | "add-suffix" | "error"`.

37. **`BucketChoice`** — Union type `"optionsBucket" | "fileFieldsBucket"`.

38. **`File`** — Database model for a file record.

39. **`FileCreateInput`** / **`FileUpdateInput`** — Input types for creating and updating file records.

40. **`GraphQLFileUpload`** / **`GraphQLUpload`** — Re-exported from `graphql-upload-minimal` for consumers using GraphQL file uploads.

41. **`S3ClientConfig`** — Re-exported from `@aws-sdk/client-s3` for consumers constructing raw S3 client configurations.
