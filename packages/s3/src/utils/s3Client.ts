import { ReadStream } from "node:fs";
import { Readable } from "node:stream";

import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { convertStreamToBuffer } from ".";

import type {
  AbortMultipartUploadCommandOutput,
  CompleteMultipartUploadCommandOutput,
  DeleteObjectCommandOutput,
  ListObjectsCommandOutput,
} from "@aws-sdk/client-s3";
import type { ApiConfig } from "@prefabs.tech/fastify-config";

class s3Client {
  protected _bucket: string = undefined as unknown as string;
  protected _config: ApiConfig;
  protected _storageClient: S3Client;

  constructor(config: ApiConfig) {
    this._config = config;
    this._storageClient = this.init();
  }

  get config() {
    return this._config;
  }

  get bucket() {
    return this._bucket;
  }

  set bucket(bucket: string) {
    this._bucket = bucket;
  }

  /**
   * Deletes an object from the Amazon S3 bucket.
   * @param {string} filePath - The path of the object to delete in the S3 bucket.
   * @returns {Promise<DeleteObjectCommandOutput>} A promise that resolves when the object is successfully deleted.
   */
  public async delete(filePath: string): Promise<DeleteObjectCommandOutput> {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: filePath,
    });

    return await this._storageClient.send(deleteCommand);
  }

  /**
   * Generates a presigned URL for downloading a file from the specified S3 bucket.
   *
   * @param {string} filePath - The path or key of the file in the bucket.
   * @param {string} originalFileName - The name to be used when downloading the file.
   * @param {number} signedUrlExpiresInSecond - (Optional) The expiration time of the presigned URL in seconds (default: 3600 seconds).
   * @returns {Promise<string | undefined>} A Promise that resolves with the generated presigned URL or undefined if an error occurs.
   */
  public async generatePresignedUrl(
    filePath: string,
    originalFileName: string,
    signedUrlExpiresInSecond = 3600,
  ): Promise<string | undefined> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: filePath,
      ResponseContentDisposition: `attachment; filename="${originalFileName}"`,
    });

    return await getSignedUrl(this._storageClient, command, {
      expiresIn: signedUrlExpiresInSecond,
    });
  }

  /**
   * Retrieves a file from the specified S3 bucket.
   *
   * @param {string} filePath - The path or key of the file to retrieve from the bucket.
   * @returns {Promise<{ ContentType: string, Body: Buffer }>} A Promise that resolves with the retrieved file's content type and content as a Buffer.
   */
  public async get(filePath: string) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: filePath,
    });

    const response = await this._storageClient.send(command);

    const stream: Readable = response.Body as Readable;

    const streamValue = await convertStreamToBuffer(stream);

    return {
      ContentType: response.ContentType,
      Body: streamValue,
    };
  }

  /**
   * Uploads a file to the specified S3 bucket.
   *
   * @param {Buffer} fileStream - The file content as a Buffer.
   * @param {string} key - The key (file name) to use when storing the file in the bucket.
   * @param {string} mimetype - The MIME type of the file.
   * @returns {Promise<PutObjectCommandOutput>} A Promise that resolves with information about the uploaded object.
   */
  public async upload(
    fileStream: Buffer | ReadStream,
    key: string,
    mimetype: string,
  ): Promise<
    AbortMultipartUploadCommandOutput | CompleteMultipartUploadCommandOutput
  > {
    const putCommand = new Upload({
      client: this._storageClient,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: fileStream,
        ContentType: mimetype,
      },
    });

    return await putCommand.done();
  }

  /**
   * Checks if a file with the given key exists in the S3 bucket.
   * @param key - The key (combination of path & file name) to check for in the bucket.
   * @returns Promise<boolean> - True if the file exists; otherwise, false.
   */
  public async isFileExists(key: string): Promise<boolean> {
    try {
      const headObjectCommand = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this._storageClient.send(headObjectCommand);

      return !!response;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.name === "NotFound") {
        return false;
      }

      throw error;
    }
  }

  /**
   * Retrieves a list of objects from the S3 bucket with a specified prefix.
   *
   * @param {string} baseName - The prefix used to filter objects within the S3 bucket.
   * @returns {Promise<ListObjectsCommandOutput>} A Promise that resolves to the result of the list operation.
   */
  public async getObjects(baseName: string): Promise<ListObjectsCommandOutput> {
    return await this._storageClient.send(
      new ListObjectsCommand({
        Bucket: this.bucket,
        Prefix: baseName,
      }),
    );
  }

  protected init(): S3Client {
    return new S3Client(this.config.s3.clientConfig);
  }
}

export default s3Client;
