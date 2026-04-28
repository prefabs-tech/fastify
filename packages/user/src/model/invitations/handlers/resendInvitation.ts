import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify";

import type { Invitation } from "../../../types/invitation";

import getInvitationService from "../../../lib/getInvitationService";
import isInvitationValid from "../../../lib/isInvitationValid";
import sendInvitation from "../../../lib/sendInvitation";

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
