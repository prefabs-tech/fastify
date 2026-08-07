import type { FastifyReply, FastifyRequest } from "fastify";

import getUserService from "../../../lib/getUserService";

const disable = async (request: FastifyRequest, reply: FastifyReply) => {
  const { config, dbSchema, server, slonik, user } = request;

  if (!user) {
    throw server.httpErrors.unauthorized("Unauthorised");
  }

  const { id } = request.params as { id: string };

  if (user.id === id) {
    throw server.httpErrors.conflict("You cannot disable yourself");
  }

  const service = getUserService(config, slonik, dbSchema);

  const response = await service.update(id, { disabled: true });

  if (!response) {
    throw server.httpErrors.notFound(`user id ${id} not found`);
  }

  return await reply.send({ status: "OK" });
};

export default disable;
