import { ReadStream } from "node:fs";

import {
  ADD_SUFFIX,
  BUCKET_FROM_FILE_FIELDS,
  BUCKET_FROM_OPTIONS,
  ERROR,
  OVERWRITE,
} from "../constants";

import type { FileCreateInput } from "./file";

type BucketChoice = typeof BUCKET_FROM_FILE_FIELDS | typeof BUCKET_FROM_OPTIONS;
type FilenameResolutionStrategy =
  | typeof ADD_SUFFIX
  | typeof ERROR
  | typeof OVERWRITE;

interface BaseOption {
  bucket?: string;
}

interface PresignedUrlOptions extends BaseOption {
  signedUrlExpiresInSecond?: number;
}

interface FilePayloadOptions extends BaseOption {
  bucketChoice?: BucketChoice;
  filenameResolutionStrategy?: FilenameResolutionStrategy;
  path?: string;
}

interface FilePayload {
  file: {
    fileContent: Multipart;
    fileFields: FileCreateInput;
  };
  options?: FilePayloadOptions;
}

interface Multipart {
  data: Buffer | ReadStream;
  filename: string;
  encoding?: string;
  mimetype: string;
  limit?: boolean;
}
interface S3Config {
  accessKey: string;
  bucket: string | Record<string, string>;
  endPoint?: string;
  fileSizeLimitInBytes?: number;
  filenameResolutionStrategy?: FilenameResolutionStrategy;
  forcePathStyle?: boolean;
  secretKey: string;
  region?: string;
  table?: {
    name?: string;
  };
}

export type {
  BucketChoice,
  PresignedUrlOptions,
  FilePayload,
  FilePayloadOptions,
  FilenameResolutionStrategy,
  Multipart,
  S3Config,
};

export type * from "./file";
