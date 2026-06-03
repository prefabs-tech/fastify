import type { FastifyReply, FastifyRequest } from "fastify";

import { CustomError } from "@prefabs.tech/fastify-error-handler";

import RoleService from "../service";

const updatePermissions = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const { body } = request;

  try {
    const { permissions, role } = body as {
      permissions: string[];
      role: string;
    };

    const service = new RoleService();
    const updatedPermissionsResponse = await service.updateRolePermissions(
      role,
      permissions,
    );

    return reply.send(updatedPermissionsResponse);
  } catch (error) {
    if (error instanceof CustomError) {
      throw request.server.httpErrors.unprocessableEntity(error.message);
    }

    throw error;
  }
};

export default updatePermissions;
