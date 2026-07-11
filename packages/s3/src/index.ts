// Imported for its ApiConfig module augmentation only
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { GraphqlEnabledPlugin } from "@prefabs.tech/fastify-graphql";

import type { S3Config } from "./types";

declare module "@prefabs.tech/fastify-config" {
  interface ApiConfig {
    s3: S3Config;
  }
}

export * from "./constants";
export * from "./migrations/queries";

export { default as FileService } from "./model/files/service";
export { default } from "./plugin";
export { default as ajvFilePlugin } from "./plugins/ajvFile";
/** @deprecated The upload transport moved to @prefabs.tech/fastify-graphql
 * and is registered by the graphql plugin (uploads option). Removed in the
 * next major. */
export { default as multipartParserPlugin } from "./plugins/deprecatedMultipartParser";
export type { FilePayload, Multipart, S3Config, S3Options } from "./types";
export type { File, FileCreateInput, FileUpdateInput } from "./types/file";

export { default as S3Client } from "./utils/s3Client";
export type { S3ClientConfig } from "@aws-sdk/client-s3";
/** @deprecated Import from @prefabs.tech/fastify-graphql instead. Removed in
 * the next major. */
export type {
  GraphQLFileUpload,
  GraphQLUpload,
} from "@prefabs.tech/fastify-graphql";
