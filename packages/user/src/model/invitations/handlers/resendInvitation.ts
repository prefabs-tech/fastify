import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify/index.js";

import type { Invitation } from "../../../types/invitation.js";

import getInvitationService from "../../../lib/getInvitationService.js";
import isInvitationValid from "../../../lib/isInvitationValid.js";
import sendInvitation from "../../../lib/sendInvitation.js";

const resendInvitation = async (
  request: SessionRequest,
  reply: FastifyReply,
) => {
  const { config, dbSchema, headers, hostname, log, params, server, slonik } =
    request;

  const { id } = params as { id: string };

  const service = getInvitationService(config, slonik, dbSchema);

  const invitation = await service.findById(id);

  // is invitation valid
  if (!invitation || !isInvitationValid(invitation)) {
    return reply.send({
      message: "Invitation is invalid or has expired",
      status: "ERROR",
    });
  }

  const url = headers.referer || headers.origin || hostname;

  try {
    sendInvitation(server, invitation, url);
  } catch (error) {
    log.error(error);
  }

  const data: Partial<Invitation> = invitation;

  delete data.token;

  return reply.send(data);
};

export default resendInvitation;
