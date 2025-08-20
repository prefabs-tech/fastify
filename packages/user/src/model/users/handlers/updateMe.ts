import { CustomError } from "@prefabs.tech/fastify-error-handler";
import { EmailVerificationClaim } from "supertokens-node/recipe/emailverification";
import { getUserById } from "supertokens-node/recipe/thirdpartyemailpassword";

import { ERROR_CODES } from "../../../constants";
import getUserService from "../../../lib/getUserService";
import createUserContext from "../../../supertokens/utils/createUserContext";
import ProfileValidationClaim from "../../../supertokens/utils/profileValidationClaim";
import filterUserUpdateInput from "../filterUserUpdateInput";

import type { UserUpdateInput } from "../../../types";
import type { File } from "@prefabs.tech/fastify-s3";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify";

const updateMe = async (request: SessionRequest, reply: FastifyReply) => {
  const { body, config, dbSchema, server, slonik, user } =
    request as FastifyRequest<{
      Body: UserUpdateInput;
    }>;

  if (!user) {
    throw server.httpErrors.unauthorized("Unauthorised");
  }

  try {
    let file: File | undefined;
    const { photo, ...input } = body as UserUpdateInput;

    const service = getUserService(config, slonik, dbSchema);

    filterUserUpdateInput(input);

    if (photo) {
      file = await service.uploadPhoto(photo, user.id, user.id);
    }

    const updatedUser = await service.update(user.id, {
      ...input,
      ...(file && {
        photoId: file.id as number,
      }),
    });

    if (user.photoId && user.photoId !== updatedUser.photoId) {
      await service.fileService.delete(user.photoId);
    }

    request.user = updatedUser;

    const authUser = await getUserById(user.id);

    if (request.config.user.features?.profileValidation?.enabled) {
      await request.session?.fetchAndSetClaim(
        new ProfileValidationClaim(),
        createUserContext(undefined, request),
      );
    }

    if (request.config.user.features?.signUp?.emailVerification) {
      await request.session?.fetchAndSetClaim(
        EmailVerificationClaim,
        createUserContext(undefined, request),
      );
    }

    const response = {
      ...updatedUser,
      thirdParty: authUser?.thirdParty,
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

export default updateMe;
