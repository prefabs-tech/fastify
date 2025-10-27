import Service from "../service";

import type { Invitation } from "../../../types/invitation";
import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify";

const deleteInvitation = async (
  request: SessionRequest,
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
