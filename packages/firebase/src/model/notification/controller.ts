import type { FastifyInstance } from "fastify";

import { ROUTE_SEND_NOTIFICATION } from "../../constants.js";
import isFirebaseEnabled from "../../middlewares/isFirebaseEnabled.js";
import handlers from "./handlers/index.js";
import { sendNotificationSchema } from "./schema.js";

/**
 * Registers an authenticated test endpoint to send a push notification to a user’s
 * registered device tokens (enabled via `config.firebase.notification.test`).
 */
const plugin = async (fastify: FastifyInstance) => {
  const handlersConfig = fastify.config.firebase.handlers?.notification;
  const notificationConfig = fastify.config.firebase.notification;

  if (notificationConfig?.test?.enabled) {
    fastify.post(
      notificationConfig.test.path || ROUTE_SEND_NOTIFICATION,
      {
        preHandler: [fastify.verifySession(), isFirebaseEnabled(fastify)],
        schema: sendNotificationSchema,
      },
      handlersConfig?.sendNotification || handlers.sendNotification,
    );
  }
};

export default plugin;
