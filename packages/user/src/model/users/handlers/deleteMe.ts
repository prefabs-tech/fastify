import { CustomError } from "@prefabs.tech/fastify-error-handler";

import getUserService from "../../../lib/getUserService";

import type { FastifyReply, FastifyRequest } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify";

const deleteMe = async (request: SessionRequest, reply: FastifyReply) => {
  const { body, config, dbSchema, server, slonik, user } =
    request as FastifyRequest<{
      Body: {
        password: string;
      };
    }>;

  if (!user) {
    throw server.httpErrors.unauthorized("Unauthorised");
  }

  try {
    const password = body?.password ?? "";

    const service = getUserService(config, slonik, dbSchema);

    await service.deleteMe(user.id, password);

    return reply.send({ status: "OK" });
  } catch (error) {
    if (error instanceof CustomError) {
      throw server.httpErrors.unprocessableEntity(error.message);
    }

    throw error;
  }
};

export default deleteMe;
