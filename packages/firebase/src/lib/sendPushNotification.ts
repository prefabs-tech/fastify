import admin from "firebase-admin";

import type { MulticastMessage } from "firebase-admin/lib/messaging/messaging-api";

const sendPushNotification = async (message: MulticastMessage) => {
  await admin.messaging().sendEachForMulticast(message);
};

export default sendPushNotification;
