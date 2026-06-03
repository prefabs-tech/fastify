import type { FastifyReply, FastifyRequest } from "fastify";

import type { Invitation } from "../../../types/invitation";

import Service from "../service";

const deleteInvitation = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const { config, dbSchema, params, slonik } = request;

  const { id } = params as { id: string };

  const service = new Service(config, slonik, dbSchema);

  const invitation = await service.delete(id);

  if (!invitation) {
    throw request.server.httpErrors.notFound("Invitation not found");
  }

  const data: Partial<Invitation> = invitation;

  delete data.token;

  return reply.send(data);
};

export default deleteInvitation;
