import { CustomError } from "@prefabs.tech/fastify-error-handler";

import { ERROR_CODES } from "../../../constants";
import getInvitationService from "../../../lib/getInvitationService";
import sendInvitation from "../../../lib/sendInvitation";

import type {
  Invitation,
  InvitationCreateInput,
} from "../../../types/invitation";
import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify";

const createInvitation = async (
  request: SessionRequest,
  reply: FastifyReply,
) => {
  const {
    body,
    config,
    dbSchema,
    headers,
    hostname,
    log,
    server,
    slonik,
    user,
  } = request;

  if (!user) {
    throw server.httpErrors.unauthorized("Unauthorised");
  }

  const { appId, email, expiresAt, payload, role } =
    body as InvitationCreateInput;

  const service = getInvitationService(config, slonik, dbSchema);

  const invitationCreateInput: InvitationCreateInput = {
    appId,
    email,
    expiresAt,
    invitedById: user.id,
    role,
  };

  if (Object.keys(payload || {}).length > 0) {
    invitationCreateInput.payload = JSON.stringify(payload);
  }

  let invitation: Invitation | undefined;

  try {
    invitation = await service.create(invitationCreateInput);
  } catch (error: unknown) {
    // Only duplicate pending invitations are handled here instead of
    // `httpErrors.createError`. That throw path is formatted by the global error
    // handler as an HttpError and includes extra properties (for example `name`)
    // alongside `code`. This route keeps an explicit 422 body with
    // `code`, `error`, `message`, and `statusCode` only for this conflict so
    // consumers see a stable contract. Other `CustomError` codes from the
    // invitation service still use the standard throw path below.
    if (
      error instanceof CustomError &&
      error.code === ERROR_CODES.INVITATION_ALREADY_EXISTS
    ) {
      return reply.code(422).send({
        code: error.code,
        error: "Unprocessable Entity",
        message: error.message,
        statusCode: 422,
      });
    }

    if (error instanceof CustomError) {
      throw server.httpErrors.createError(422, error.message, {
        code: error.code,
      });
    }

    if (error instanceof Error) {
      throw server.httpErrors.createError(422, error.message, {});
    }

    throw server.httpErrors.createError(422, "Unknown error", {});
  }

  if (invitation) {
    const url = headers.referer || headers.origin || hostname;

    try {
      sendInvitation(server, invitation, url);
    } catch (error) {
      log.error(error);
    }

    const data: Partial<Invitation> = invitation;

    delete data.token;

    reply.send(data);
  }
};

export default createInvitation;
