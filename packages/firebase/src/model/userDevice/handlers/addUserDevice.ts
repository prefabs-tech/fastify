import Service from "../service";

import type { UserDeviceCreateInput } from "../../../types";
import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify";

const addUserDevice = async (request: SessionRequest, reply: FastifyReply) => {
  const { body, config, dbSchema, slonik, user } = request;

  if (!user) {
    throw request.server.httpErrors.unauthorized("Unauthorised");
  }

  const { deviceToken } = body as UserDeviceCreateInput;

  const service = new Service(config, slonik, dbSchema);

  reply.send(await service.create({ userId: user.id, deviceToken }));
};

export default addUserDevice;
