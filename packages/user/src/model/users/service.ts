import { CustomError } from "@prefabs.tech/fastify-error-handler";
import { File, FileService, Multipart } from "@prefabs.tech/fastify-s3";
import { BaseService } from "@prefabs.tech/fastify-slonik";
import Session from "supertokens-node/recipe/session";
import ThirdPartyEmailPassword from "supertokens-node/recipe/thirdpartyemailpassword";

import type { User, UserCreateInput, UserUpdateInput } from "../../types";

import {
  DEFAULT_USER_PHOTO_MAX_SIZE_IN_MB,
  ERROR_CODES,
} from "../../constants";
import validatePassword from "../../validator/password";
import UserSqlFactory from "./sqlFactory";

class UserService extends BaseService<User, UserCreateInput, UserUpdateInput> {
  get bucket(): string | undefined {
    return this.config.user.s3?.bucket;
  }
  get factory(): UserSqlFactory {
    return super.factory as UserSqlFactory;
  }

  get fileService() {
    if (!this._fileService) {
      this._fileService = new FileService(
        this.config,
        this.database,
        this.schema,
      );
    }

    return this._fileService;
  }
  get sqlFactoryClass() {
    return UserSqlFactory;
  }

  protected _fileService: FileService | undefined;

  protected _supportedMimeTypes: string[] = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  protected photoFilename = "photo";

  protected photoPath = "photo";

  async changeEmail(id: string, email: string) {
    const response = await ThirdPartyEmailPassword.updateEmailOrPassword({
      email: email,
      userId: id,
    });

    if (response.status !== "OK") {
      throw new CustomError(response.status, response.status);
    }

    const query = this.factory.getUpdateSql(id, { email });

    return await this.database.connect((connection) => {
      return connection.query(query).then((data) => {
        return data.rows[0];
      });
    });
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    const passwordValidation = validatePassword(newPassword, this.config);

    if (!passwordValidation.success) {
      return {
        message: passwordValidation.message,
        status: "FIELD_ERROR",
      };
    }

    const userInfo = await ThirdPartyEmailPassword.getUserById(userId);

    if (oldPassword && newPassword) {
      if (userInfo) {
        const isPasswordValid =
          await ThirdPartyEmailPassword.emailPasswordSignIn(
            userInfo.email,
            oldPassword,
            { dbSchema: this.schema },
          );

        if (isPasswordValid.status === "OK") {
          const result = await ThirdPartyEmailPassword.updateEmailOrPassword({
            password: newPassword,
            userId,
          });

          if (result) {
            await Session.revokeAllSessionsForUser(userId);

            return {
              status: "OK",
            };
          } else {
            throw new CustomError(
              "Failed to change password",
              ERROR_CODES.CHANGE_PASSWORD,
            );
          }
        } else {
          return {
            message: "Invalid password",
            status: "INVALID_PASSWORD",
          };
        }
      } else {
        throw new CustomError("User not found", ERROR_CODES.USER_NOT_FOUND);
      }
    } else {
      return {
        message: "Password cannot be empty",
        status: "FIELD_ERROR",
      };
    }
  }

  async deleteFile(fileId: number): Promise<File | null | undefined> {
    if (!this.bucket) {
      console.warn(
        "S3 bucket for user model is not configured. Skipping file delete.",
      );

      return undefined;
    }

    const result = await this.fileService.deleteFile(fileId, {
      bucket: this.bucket,
    });

    return result;
  }

  async deleteMe(userId: string, password: string) {
    const user = await ThirdPartyEmailPassword.getUserById(userId);

    if (!user) {
      throw new CustomError("User not found", ERROR_CODES.USER_NOT_FOUND);
    }

    if (!password) {
      throw new CustomError("Invalid password", ERROR_CODES.INVALID_PASSWORD);
    }

    const signInResponse = await ThirdPartyEmailPassword.emailPasswordSignIn(
      user.email,
      password,
      { dbSchema: this.schema },
    );

    if (signInResponse.status === "OK") {
      return await this.delete(userId);
    } else {
      throw new CustomError("Invalid password", ERROR_CODES.INVALID_PASSWORD);
    }
  }

  async uploadPhoto(
    photo: Multipart,
    userId: string,
    uploadedById: string,
    uploadedAt?: number,
  ): Promise<File | undefined> {
    const filename = this.photoFilename;
    const path = this.getPhotoPath(userId);

    return this.upload(photo, path, filename, uploadedById, uploadedAt);
  }

  protected getPhotoPath(userId: string): string {
    return `${userId}/${this.photoPath}`;
  }

  protected async getUserWithPhoto(user: User): Promise<User> {
    if (user.photoId) {
      const file = await this.fileService.presignedUrl(user.photoId, {
        signedUrlExpiresInSecond: 604_800,
      });

      user.photo = {
        id: user.photoId,
        url: file?.url || "",
      };
    }

    return user;
  }

  protected async postDelete(result: User): Promise<User> {
    await Session.revokeAllSessionsForUser(result.id);

    return result;
  }

  protected async postFindById(result: User): Promise<User> {
    return await this.getUserWithPhoto(result);
  }

  protected async postFindOne(result: User): Promise<User> {
    return await this.getUserWithPhoto(result);
  }

  protected async postUpdate(result: User): Promise<User> {
    return await this.getUserWithPhoto(result);
  }

  protected async upload(
    data: Multipart,
    path: string,
    filename: string,
    uploadedById: string,
    uploadedAt?: number,
  ): Promise<File | undefined> {
    if (!this.bucket) {
      console.warn(
        "S3 bucket for user model is not configured. Skipping file upload.",
      );

      return undefined;
    }

    const photoSizeLimit =
      this.config.user.photoMaxSizeInMB || DEFAULT_USER_PHOTO_MAX_SIZE_IN_MB;

    if (photoSizeLimit) {
      const maxSizeInBytes = photoSizeLimit * 1024 * 1024; // Convert to bytes

      if (Buffer.isBuffer(data.data) && data.data.length > maxSizeInBytes) {
        throw new CustomError(
          `File size exceeds ${photoSizeLimit}MB limit`,
          ERROR_CODES.PHOTO_FILE_TOO_LARGE,
        );
      }
    }

    if (!this._supportedMimeTypes.includes(data.mimetype)) {
      throw new CustomError(
        "Unsupported file type for profile picture",
        ERROR_CODES.UNSUPPORTED_PHOTO_FILE_TYPE,
      );
    }

    this.fileService.filename = filename;

    const file = await this.fileService.upload({
      file: {
        fileContent: data,
        fileFields: {
          bucket: this.bucket,
          uploadedAt: uploadedAt || Date.now(),
          uploadedById: uploadedById,
        },
      },
      options: {
        path,
      },
    });

    return file;
  }
}

export default UserService;
