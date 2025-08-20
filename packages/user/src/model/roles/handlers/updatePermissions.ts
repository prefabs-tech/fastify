import { CustomError } from "@prefabs.tech/fastify-error-handler";

import RoleService from "../service";

import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify";

const updatePermissions = async (
  request: SessionRequest,
  reply: FastifyReply,
) => {
  const { body } = request;

  try {
    const { role, permissions } = body as {
      role: string;
      permissions: string[];
    };

    const service = new RoleService();
    const updatedPermissionsResponse = await service.updateRolePermissions(
      role,
      permissions,
    );

    return reply.send(updatedPermissionsResponse);
  } catch (error) {
    if (error instanceof CustomError) {
      request.server.httpErrors.unprocessableEntity(error.message);
    }

    throw error;
  }
};

export default updatePermissions;
