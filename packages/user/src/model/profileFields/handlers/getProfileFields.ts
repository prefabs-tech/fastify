import type { FastifyReply, FastifyRequest } from "fastify";

import getProfileFieldService from "../../../lib/getProfileFieldService";

const getProfileFields = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const { config, dbSchema, slonik } = request;

  const service = getProfileFieldService(config, slonik, dbSchema);

  const fields = await service.all([
    "id",
    "createdAt",
    "default",
    "name",
    "required",
    "sortOrder",
    "type",
    "updatedAt",
  ]);

  return reply.send({ fields });
};

export default getProfileFields;
