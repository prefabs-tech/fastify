import type { FastifyReply, FastifyRequest } from "fastify";

import getInvitationService from "../../../lib/getInvitationService";

const getInvitationByToken = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const { config, dbSchema, params, slonik } = request;

  const { token } = params as { token: string };

  const service = getInvitationService(config, slonik, dbSchema);

  const invitation = await service.findByToken(token);

  reply.send(invitation);
};

export default getInvitationByToken;
