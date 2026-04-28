import type { PaginatedList } from "@prefabs.tech/fastify-slonik";
import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify";

import type { Invitation } from "../../../types/invitation";

import getInvitationService from "../../../lib/getInvitationService";

const listInvitation = async (request: SessionRequest, reply: FastifyReply) => {
  const { config, dbSchema, query, slonik } = request;

  const { filters, limit, offset, sort } = query as {
    filters?: string;
    limit: number;
    offset?: number;
    sort?: string;
  };

  const service = getInvitationService(config, slonik, dbSchema);

  const invitations = (await service.list(
    limit,
    offset,
    filters ? JSON.parse(filters) : undefined,
    sort ? JSON.parse(sort) : undefined,
  )) as PaginatedList<Partial<Invitation>>;

  for (const invitation of invitations.data) {
    delete invitation.token;
  }

  return reply.send(invitations);
};

export default listInvitation;
