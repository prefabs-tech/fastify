import type { FastifyReply, FastifyRequest } from "fastify";

import { CustomError } from "@prefabs.tech/fastify-error-handler";

import RoleService from "../service";

const createRole = async (request: FastifyRequest, reply: FastifyReply) => {
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
