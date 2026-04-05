import type { FastifyReply } from "fastify";
import type { MulticastMessage } from "firebase-admin/lib/messaging/messaging-api";
import type { SessionRequest } from "supertokens-node/framework/fastify";

import type { TestNotificationInput } from "../../../types";

import { sendPushNotification } from "../../../lib";
import DeviceService from "../../userDevice/service";

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
    data,
    title,
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
      notification: {
        sound: "default",
      },
      priority: "high",
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
        },
      },
    },
    data: {
      ...data,
      body,
      title,
    },
    notification: {
      body,
      title,
    },
    tokens,
  };

  await sendPushNotification(message);

  reply.send({ message: "Notification sent successfully" });
};

export default testPushNotification;
