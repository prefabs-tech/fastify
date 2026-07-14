<!-- Structured feature inventory — used by automated test generation. Developer docs: see GUIDE.md -->

# Features: @prefabs.tech/fastify-s3

## Plugin Registration

1. **Main plugin (`default` export)** — Fastify plugin wrapped with `fastify-plugin`, registered with an `S3Options` object. On registration it runs database migrations and conditionally registers `@fastify/multipart` (when `options.rest?.enabled` is `true`). Registering without options falls back to composing the options from `fastify.config` (`s3`, `rest` namespaces) with a deprecation warning, and throws if `fastify.config.s3` is also missing. Throws if the `fastify.slonik` decorator is missing (the slonik plugin must be registered first). `rest.enabled` may be off entirely — the plugin still runs migrations and provides `FileService`/`S3Client` (presigned-URL, server-generated, download-only flows).

2. **Automatic database migration** — On registration the plugin creates (if not exists) the files table using the configured table name (`options.table.name`) or the default name `"files"`.

3. **Conditional REST multipart registration** — When `options.rest?.enabled` is `true`, `@fastify/multipart` is registered with `attachFieldsToBody: "keyValues"`, a shared schema id of `"fileSchema"`, a file-size limit from `options.fileSizeLimitInBytes` (defaults to `Infinity`), and an `onFile` hook that converts every part to a `{ data, encoding, filename, mimetype }` object and attaches it as the field value.

4. **GraphQL uploads (moved)** — GraphQL upload transport now lives in `@prefabs.tech/fastify-graphql` (registered by the graphql plugin, `uploads` option). This package only consumes the resulting `Upload` streams via `FileService`. In mixed REST + GraphQL mode the s3 plugin must be registered after the graphql plugin.

## Configuration

5. **`S3Config` interface** — The configuration required by the s3 plugin (`S3Options`, the `register()` argument, is `S3Config` plus the `rest` flag):
   - `clientConfig: S3ClientConfig` — passed straight to the AWS SDK `S3Client` constructor.
   - `bucket: string | Record<string, string>` — default bucket or named-bucket map.
   - `fileSizeLimitInBytes?: number` — optional file-size cap for the REST upload path (GraphQL upload limits are set via the graphql plugin's `uploads.maxFileSize`).
   - `filenameResolutionStrategy?: "overwrite" | "add-suffix" | "error"` — global default strategy when a key collision is detected in S3.
   - `table?: { name?: string }` — overrides the default `"files"` table name.

6. **Module augmentation of `@prefabs.tech/fastify-config` (deprecated)** — Adds `s3: S3Config` to the `ApiConfig` interface so the config is accessible via `fastify.config.s3` throughout the application. Deprecated along with the `fastify.config` configuration fallback (Feature 1); will be removed in a future release. Pass the configuration directly to `register()` instead.

## Sub-plugins (independently exportable)

7. **`ajvFilePlugin`** — AJV keyword plugin (passed via `Fastify({ ajv: { plugins: [...] } })`, not `register()`) that registers the `isFile` custom keyword. Schemas using `isFile: true` validate that the value is a multipart file object (`{ data, filename, mimetype }`). For array schemas it validates every element. During compile the keyword also rewrites the parent schema (`type: "string"`, `format: "binary"`) so OpenAPI tooling renders a proper file-upload schema. Optional: required only when a consumer route schema uses `isFile` (unknown-keyword startup throw otherwise); the plugin itself registers no schemas. Adaptation of `@fastify/multipart`'s `ajvFilePlugin` (not a re-export — the validator targets this package's normalized `Multipart` body shape and adds array support).

8. **`multipartParserPlugin` (deprecated compat wrapper)** — Thin wrapper around the upload transport from `@prefabs.tech/fastify-graphql`: logs a deprecation warning, defaults the graphql path from `fastify.config.graphql.path` when present, and no-ops if the transport is already registered (`hasPlugin` check). Removed in a future release; use the graphql plugin's `uploads` option instead.

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

29. **`createFilesTableQuery(config)`** — Returns a `CREATE TABLE IF NOT EXISTS` SQL query for the files table with columns: `id`, `original_file_name`, `bucket`, `description`, `key`, `uploaded_by_id`, `uploaded_at`, `download_count` (default `0`), `last_downloaded_at`, `created_at`, `updated_at`. Accepts an `S3Options` object (table name from `options.table.name`) or, deprecated, a full `ApiConfig` (table name from `config.s3.table.name`); defaults to `"files"`.

## Error Codes

30. **`ERROR_CODES.FILE_NOT_FOUND`** (`"FILE_NOT_FOUND_ERROR"`) — Thrown by `FileService.download`, `presignedUrl`, and `deleteFile` when the requested file ID is not found in the database.

31. **`ERROR_CODES.FILE_ALREADY_EXISTS_IN_S3`** (`"FILE_ALREADY_EXISTS_IN_S3_ERROR"`) — Thrown by `FileService.upload` when a key collision is detected and `filenameResolutionStrategy` is `"error"`.

## Type Exports

32. **`S3Config`** — Plugin configuration shape (see Feature 5). **`S3Options`** — plugin registration options: `S3Config` plus `rest?: { enabled? }`.

33. **`FilePayload`** — Input type for `FileService.upload`, containing `{ file: { fileContent: Multipart, fileFields: FileCreateInput }, options?: FilePayloadOptions }`.

34. **`FilePayloadOptions`** — Upload options: `bucket?`, `bucketChoice?`, `filenameResolutionStrategy?`, `path?`.

35. **`Multipart`** — Normalised multipart file object: `{ data: Buffer | ReadStream, encoding?, filename, limit?, mimetype }`.

36. **`FilenameResolutionStrategy`** — Union type `"overwrite" | "add-suffix" | "error"`.

37. **`BucketChoice`** — Union type `"optionsBucket" | "fileFieldsBucket"`.

38. **`File`** — Database model for a file record.

39. **`FileCreateInput`** / **`FileUpdateInput`** — Input types for creating and updating file records.

40. **`GraphQLFileUpload`** / **`GraphQLUpload`** — Deprecated re-exports from `@prefabs.tech/fastify-graphql`; import them from there instead. Removed in a future release.

41. **`S3ClientConfig`** — Re-exported from `@aws-sdk/client-s3` for consumers constructing raw S3 client configurations.
