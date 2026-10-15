import type { ListObjectsOutput } from "@aws-sdk/client-s3";

import { Readable } from "node:stream";

import type { BucketChoice } from "../types";

import { BUCKET_FROM_FILE_FIELDS, BUCKET_FROM_OPTIONS } from "../constants";

const convertStreamToBuffer = async (stream: Readable): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];

    // Process incoming data chunks
    stream.on("data", (chunk: Uint8Array) => chunks.push(chunk));

    // Resolve with concatenated buffer when stream ends
    stream.once("end", () => resolve(Buffer.concat(chunks)));

    // Reject the promise if there's an error with the stream
    stream.once("error", reject);
  });
};

const getBaseName = (filename: string): string => {
  return filename.replace(/\.[^.]+$/, "");
};

const getFileExtension = (filename: string): string => {
  const lastDotIndex = filename.lastIndexOf(".");

  return lastDotIndex === -1 ? "" : filename.slice(lastDotIndex + 1);
};

const getPreferredBucket = (
  optionsBucket?: string,
  fileFieldsBucket?: string,
  bucketChoice?: BucketChoice,
) => {
  if (bucketChoice === BUCKET_FROM_OPTIONS && optionsBucket) {
    return optionsBucket;
  }

  if (bucketChoice === BUCKET_FROM_FILE_FIELDS && fileFieldsBucket) {
    return fileFieldsBucket;
  }

  if (fileFieldsBucket && !optionsBucket) {
    return fileFieldsBucket;
  }

  if (optionsBucket && !fileFieldsBucket) {
    return optionsBucket;
  }

  if (fileFieldsBucket === optionsBucket) {
    return fileFieldsBucket;
  }

  return fileFieldsBucket || optionsBucket;
};

const getFilenameWithSuffix = (
  listObjects: ListObjectsOutput,
  baseFilename: string,
  fileExtension: string,
): string => {
  const contents = listObjects.Contents;
  const baseNameWithSuffixRegex = new RegExp(
    String.raw`${baseFilename}-(\d+)\.${fileExtension}$`,
  );

  // eslint-disable-next-line unicorn/no-array-reduce
  const maxNumericSuffix = contents?.reduce((maxNumber, item) => {
    const matches = item.Key?.match(baseNameWithSuffixRegex);

    if (matches) {
      const number = Number.parseInt(matches[1]);

      return Math.max(maxNumber, number);
    }

    return maxNumber;
  }, 0);

  const nextNumber = maxNumericSuffix ? maxNumericSuffix + 1 : 1;

  return `${baseFilename}-${nextNumber}.${fileExtension}`;
};

export {
  convertStreamToBuffer,
  getBaseName,
  getFileExtension,
  getFilenameWithSuffix,
  getPreferredBucket,
};
