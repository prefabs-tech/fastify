import getInvitationService from "../../../lib/getInvitationService";
import isInvitationValid from "../../../lib/isInvitationValid";
import sendInvitation from "../../../lib/sendInvitation";

import type { Invitation } from "../../../types/invitation";
import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify";

const resendInvitation = async (
  request: SessionRequest,
  reply: FastifyReply,
) => {
  const { config, dbSchema, headers, hostname, log, params, slonik, server } =
    request;

  const { id } = params as { id: string };

  const service = getInvitationService(config, slonik, dbSchema);

  const invitation = await service.findById(id);

  // is invitation valid
  if (!invitation || !isInvitationValid(invitation)) {
    return reply.send({
      status: "ERROR",
      message: "Invitation is invalid or has expired",
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
