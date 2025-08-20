import { CustomError } from "@prefabs.tech/fastify-error-handler";

import RoleService from "../service";

import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify";

const createRole = async (request: SessionRequest, reply: FastifyReply) => {
  const { body } = request;

  const { role, permissions } = body as {
    role: string;
    permissions: string[];
  };

  try {
    const service = new RoleService();

    const createResponse = await service.createRole(role, permissions);

    return reply.send(createResponse);
  } catch (error) {
    if (error instanceof CustomError) {
      request.server.httpErrors.unprocessableEntity(error.message);
    }

    throw error;
  }
};

export default createRole;
