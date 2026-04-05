import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify";

import { CustomError } from "@prefabs.tech/fastify-error-handler";

import RoleService from "../service";

const createRole = async (request: SessionRequest, reply: FastifyReply) => {
  const { body } = request;

  const { permissions, role } = body as {
    permissions: string[];
    role: string;
  };

  try {
    const service = new RoleService();

    const createResponse = await service.createRole(role, permissions);

    return reply.send(createResponse);
  } catch (error) {
    if (error instanceof CustomError) {
      throw request.server.httpErrors.unprocessableEntity(error.message);
    }

    throw error;
  }
};

export default createRole;
