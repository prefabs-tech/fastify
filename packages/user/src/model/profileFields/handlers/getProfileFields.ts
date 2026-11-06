import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify/index.js";

import getProfileFieldService from "../../../lib/getProfileFieldService.js";

const getProfileFields = async (
  request: SessionRequest,
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
