import { sendPushNotification } from "../../../lib";
import DeviceService from "../../userDevice/service";

import type { TestNotificationInput } from "../../../types";
import type { FastifyReply } from "fastify";
import type { MulticastMessage } from "firebase-admin/lib/messaging/messaging-api";
import type { SessionRequest } from "supertokens-node/framework/fastify";

const testPushNotification = async (
  request: SessionRequest,
  reply: FastifyReply,
) => {
  const user = request.user;

  if (!user) {
    throw request.server.httpErrors.unauthorized("Unauthorised");
  }

  const {
    body,
    title,
    data,
    userId: receiverId,
  } = request.body as TestNotificationInput;

  const service = new DeviceService(
    request.config,
    request.slonik,
    request.dbSchema,
  );

  const receiverDevices = await service.getByUserId(receiverId);

  if (!receiverDevices || receiverDevices.length === 0) {
    throw request.server.httpErrors.unprocessableEntity(
      "No devices found for the receiver",
    );
  }

  const tokens = receiverDevices.map((device) => device.deviceToken as string);

  const message: MulticastMessage = {
    android: {
      priority: "high",
      notification: {
        sound: "default",
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
        },
      },
    },
    tokens,
    notification: {
      title,
      body,
    },
    data: {
      ...data,
      title,
      body,
    },
  };

  await sendPushNotification(message);

  reply.send({ message: "Notification sent successfully" });
};

export default testPushNotification;
