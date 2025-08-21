import { formatDate } from "@prefabs.tech/fastify-slonik";

import getInvitationService from "../../../lib/getInvitationService";

import type { Invitation } from "../../../types/invitation";
import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify";

const revokeInvitation = async (
  request: SessionRequest,
  reply: FastifyReply,
) => {
  const { config, dbSchema, params, server, slonik } = request;

  const { id } = params as { id: string };

  const service = getInvitationService(config, slonik, dbSchema);

  let invitation = await service.findById(id);

  if (!invitation) {
    throw server.httpErrors.unprocessableEntity("Invitation not found");
  } else if (invitation.acceptedAt) {
    throw server.httpErrors.unprocessableEntity(
      "Invitation is already accepted",
    );
  } else if (Date.now() > invitation.expiresAt) {
    throw server.httpErrors.unprocessableEntity("Invitation is expired");
  } else if (invitation.revokedAt) {
    throw server.httpErrors.unprocessableEntity(
      "Invitation is already revoked",
    );
  }

  invitation = await service.update(id, {
    revokedAt: formatDate(new Date(Date.now())),
  });

  const data: Partial<Invitation> = invitation;

  delete data.token;

  reply.send(data);
};

export default revokeInvitation;
