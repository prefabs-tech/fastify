import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify/index.js";

import type {
  Invitation,
  InvitationCreateInput,
} from "../../../types/invitation.js";

import getInvitationService from "../../../lib/getInvitationService.js";
import sendInvitation from "../../../lib/sendInvitation.js";

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    throw server.httpErrors.createError(422, error.message, {
      code: error.code,
    });
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
