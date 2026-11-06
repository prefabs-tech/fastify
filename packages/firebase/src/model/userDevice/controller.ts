import type { FastifyInstance } from "fastify";

import {
  ROUTE_USER_DEVICE_ADD,
  ROUTE_USER_DEVICE_REMOVE,
} from "../../constants.js";
import isFirebaseEnabled from "../../middlewares/isFirebaseEnabled.js";
import handlers from "./handlers/index.js";
import { deleteUserDeviceSchema, postUserDeviceSchema } from "./schema.js";

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
