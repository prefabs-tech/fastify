import type { FastifyInstance } from "fastify";

import { ROUTE_SEND_NOTIFICATION } from "../../constants";
import isFirebaseEnabled from "../../middlewares/isFirebaseEnabled";
import handlers from "./handlers";
import { sendNotificationSchema } from "./schema";

const plugin = async (fastify: FastifyInstance) => {
  const notificationHandlers = fastify.config.firebase.handlers?.notification;
  const notificationConfig = fastify.config.firebase.notification;

  if (notificationConfig?.test?.enabled) {
    fastify.post(
      notificationConfig.test.path || ROUTE_SEND_NOTIFICATION,
      {
        preHandler: [fastify.verifySession(), isFirebaseEnabled(fastify)],
        schema: sendNotificationSchema,
      },
      notificationHandlers?.sendNotification || handlers.sendNotification,
    );
  }
};

export default plugin;
