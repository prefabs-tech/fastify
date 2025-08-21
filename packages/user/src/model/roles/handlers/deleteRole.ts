import { CustomError } from "@prefabs.tech/fastify-error-handler";

import { ERROR_CODES } from "../../../constants";
import RoleService from "../service";

import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify";

const deleteRole = async (request: SessionRequest, reply: FastifyReply) => {
  const { query } = request;

  try {
    let { role } = query as { role?: string };

    if (role) {
      try {
        role = JSON.parse(role) as string;
      } catch {
        /* empty */
      }

      if (typeof role != "string") {
        throw new CustomError("Invalid role", ERROR_CODES.UNKNOWN_ROLE_ERROR);
      }

      const service = new RoleService();

      const deleteResponse = await service.deleteRole(role);

      return reply.send(deleteResponse);
    }

    throw new CustomError("Invalid role", ERROR_CODES.UNKNOWN_ROLE_ERROR);
  } catch (error) {
    if (error instanceof CustomError) {
      throw request.server.httpErrors.unprocessableEntity(error.message);
    }

    throw error;
  }
};

export default deleteRole;
