import type { S3Config } from "./types";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { GraphqlEnabledPlugin } from "@prefabs.tech/fastify-graphql";

declare module "@prefabs.tech/fastify-config" {
  interface ApiConfig {
    s3: S3Config;
  }
}

export * from "./constants";

export { default as FileService } from "./model/files/service";
export { default as S3Client } from "./utils/s3Client";
export type { FilePayload, Multipart, S3Config } from "./types";
export type { File, FileCreateInput, FileUpdateInput } from "./types/file";
export type {
  FileUpload as GraphQLFileUpload,
  Upload as GraphQLUpload,
} from "graphql-upload-minimal";

export { default } from "./plugin";
export { default as ajvFilePlugin } from "./plugins/ajvFile";
export { default as multipartParserPlugin } from "./plugins/multipartParser";
