import type { Multipart } from "@prefabs.tech/fastify-s3";
import type { FastifyReply, FastifyRequest } from "fastify";

import { CustomError } from "@prefabs.tech/fastify-error-handler";

import type { AuthSession } from "../../../auth/adapter";
import type { UserUpdateInput } from "../../../types";

import { auth } from "../../../auth/adapter";
import { ERROR_CODES } from "../../../constants";
import getUserService from "../../../lib/getUserService";

const uploadPhoto = async (request: FastifyRequest, reply: FastifyReply) => {
  const { body, config, dbSchema, server, slonik, user } =
    request as FastifyRequest<{
      Body: UserUpdateInput;
    }>;

  if (!user) {
    throw server.httpErrors.unauthorized("Unauthorised");
  }

  try {
    const { photo } = body as {
      photo: Multipart | undefined;
    };

    const service = getUserService(config, slonik, dbSchema);

    if (!photo) {
      throw new CustomError(
        "Missing photo file in the request body",
        ERROR_CODES.PHOTO_FILE_MISSING,
      );
    }

    const file = await service.uploadPhoto(photo, user.id, user.id);

    const updatedUser = await service.update(user.id, {
      ...(file && {
        photoId: file.id as number,
      }),
    });

    if (user.photoId && user.photoId !== updatedUser.photoId) {
      await service.fileService.delete(user.photoId);
    }

    request.user = updatedUser;

    const authUser = await auth.emailPassword.getUserById(user.id);
    const userContext = auth.createUserContext(request);

    const session = (request as FastifyRequest & { session: AuthSession })
      .session;

    if (request.config.user.features?.profileValidation?.enabled) {
      await auth.claims.refreshSessionClaims(
        session,
        request,
        ["profileValidation"],
        userContext,
      );
    }

    if (request.config.user.features?.signUp?.emailVerification) {
      await auth.claims.refreshSessionClaims(
        session,
        request,
        ["emailVerification"],
        userContext,
      );
    }

    const response = {
      ...updatedUser,
      thirdParty: (authUser as Record<string, unknown>)?.thirdParty,
    };

    reply.send(response);
  } catch (error) {
    if (error instanceof CustomError) {
      if (error.code === ERROR_CODES.PHOTO_FILE_TOO_LARGE) {
        throw server.httpErrors.payloadTooLarge(error.message);
      }

      throw server.httpErrors.unprocessableEntity(error.message);
    }

    throw error;
  }
};

export default uploadPhoto;
