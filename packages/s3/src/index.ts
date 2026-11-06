// Imported for its ApiConfig module augmentation only
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { GraphqlEnabledPlugin } from "@prefabs.tech/fastify-graphql";

import type { S3Config } from "./types/index.js";

declare module "@prefabs.tech/fastify-config" {
  interface ApiConfig {
    /** @deprecated Supports the fastify.config configuration fallback only.
     * Pass the configuration directly to register() instead. This
     * augmentation is removed in a future release; type your own central
     * config object if you keep an s3 block in one. */
    s3: S3Config;
  }
}

export * from "./constants.js";
export * from "./migrations/queries.js";

export { default as FileService } from "./model/files/service.js";
export { default } from "./plugin.js";
export { default as ajvFilePlugin } from "./plugins/ajvFile.js";
/** @deprecated The upload transport moved to @prefabs.tech/fastify-graphql
 * and is registered by the graphql plugin (uploads option). Removed in a
 * future release. */
export { default as multipartParserPlugin } from "./plugins/deprecatedMultipartParser.js";
export type { File, FileCreateInput, FileUpdateInput } from "./types/file.js";
export type {
  FilePayload,
  Multipart,
  S3Config,
  S3Options,
} from "./types/index.js";

export { default as S3Client } from "./utils/s3Client.js";
export type { S3ClientConfig } from "@aws-sdk/client-s3";
/** @deprecated Import from @prefabs.tech/fastify-graphql instead. Removed in
 * a future release. */
export type {
  GraphQLFileUpload,
  GraphQLUpload,
} from "@prefabs.tech/fastify-graphql";
