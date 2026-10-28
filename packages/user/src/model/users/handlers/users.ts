import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify/index.js";

import getUserService from "../../../lib/getUserService.js";

const users = async (request: SessionRequest, reply: FastifyReply) => {
  const service = getUserService(
    request.config,
    request.slonik,
    request.dbSchema,
  );

  const { filters, limit, offset, sort } = request.query as {
    filters?: string;
    limit: number;
    offset?: number;
    sort?: string;
  };

  const data = await service.list(
    limit,
    offset,
    filters ? JSON.parse(filters) : undefined,
    sort ? JSON.parse(sort) : undefined,
  );

  reply.send(data);
};

export default users;
