import Service from "../service";

import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify";

const removeUserDevice = async (
  request: SessionRequest,
  reply: FastifyReply,
) => {
  const user = request.user;

  if (!user) {
    throw request.server.httpErrors.unauthorized("Unauthorised");
  }

  const { deviceToken } = request.body as { deviceToken: string };

  const service = new Service(request.config, request.slonik, request.dbSchema);

  const userDevices = await service.getByUserId(user.id);

  if (!userDevices || userDevices.length === 0) {
    throw request.server.httpErrors.notFound("No devices found for the user");
  }

  const deviceToDelete = userDevices.find(
    (device) => device.deviceToken === deviceToken,
  );

  if (!deviceToDelete) {
    throw request.server.httpErrors.unprocessableEntity(
      "Device requested to delete not owned by user",
    );
  }

  reply.send(await service.removeByDeviceToken(deviceToken));
};

export default removeUserDevice;
