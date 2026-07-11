import type { S3ClientConfig } from "@aws-sdk/client-s3";

import { ReadStream } from "node:fs";

import type { FileCreateInput } from "./file";

import {
  ADD_SUFFIX,
  BUCKET_FROM_FILE_FIELDS,
  BUCKET_FROM_OPTIONS,
  ERROR,
  OVERWRITE,
} from "../constants";

interface BaseOption {
  bucket?: string;
}
type BucketChoice = typeof BUCKET_FROM_FILE_FIELDS | typeof BUCKET_FROM_OPTIONS;

type FilenameResolutionStrategy =
  | typeof ADD_SUFFIX
  | typeof ERROR
  | typeof OVERWRITE;

interface FilePayload {
  file: {
    fileContent: Multipart;
    fileFields: FileCreateInput;
  };
  options?: FilePayloadOptions;
}

interface FilePayloadOptions extends BaseOption {
  bucketChoice?: BucketChoice;
  filenameResolutionStrategy?: FilenameResolutionStrategy;
  path?: string;
}

interface Multipart {
  data: Buffer | ReadStream;
  encoding?: string;
  filename: string;
  limit?: boolean;
  mimetype: string;
}

interface MultipartParserOptions {
  graphql?: S3GraphqlConfig;
}

interface PresignedUrlOptions extends BaseOption {
  signedUrlExpiresInSecond?: number;
}
interface S3Config {
  bucket: Record<string, string> | string;
  clientConfig: S3ClientConfig;
  filenameResolutionStrategy?: FilenameResolutionStrategy;
  fileSizeLimitInBytes?: number;
  table?: {
    name?: string;
  };
}

interface S3GraphqlConfig {
  enabled?: boolean;
  path?: string;
}

type S3Options = S3Config & {
  graphql?: S3GraphqlConfig;
  rest?: {
    enabled?: boolean;
  };
};

export type {
  BucketChoice,
  FilenameResolutionStrategy,
  FilePayload,
  FilePayloadOptions,
  Multipart,
  MultipartParserOptions,
  PresignedUrlOptions,
  S3Config,
  S3GraphqlConfig,
  S3Options,
};

export type * from "./file";
