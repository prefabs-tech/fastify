import type { FastifyInstance } from "fastify";

import {
  ROUTE_USER_DEVICE_ADD,
  ROUTE_USER_DEVICE_REMOVE,
} from "../../constants";
import isFirebaseEnabled from "../../middlewares/isFirebaseEnabled";
import handlers from "./handlers";
import { deleteUserDeviceSchema, postUserDeviceSchema } from "./schema";

const plugin = async (fastify: FastifyInstance) => {
  const handlersConfig = fastify.config.firebase.handlers?.userDevice;

  fastify.post(
    ROUTE_USER_DEVICE_ADD,
    {
      preHandler: [fastify.verifySession(), isFirebaseEnabled(fastify)],
      schema: postUserDeviceSchema,
    },
    handlersConfig?.addUserDevice || handlers.addUserDevice,
  );

  fastify.delete(
    ROUTE_USER_DEVICE_REMOVE,
    {
      preHandler: [fastify.verifySession(), isFirebaseEnabled(fastify)],
      schema: deleteUserDeviceSchema,
    },
    handlersConfig?.removeUserDevice || handlers.removeUserDevice,
  );
};

export default plugin;
