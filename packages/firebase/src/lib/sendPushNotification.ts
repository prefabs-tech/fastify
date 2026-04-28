import type { MulticastMessage } from "firebase-admin/lib/messaging/messaging-api";

import admin from "firebase-admin";

const sendPushNotification = async (message: MulticastMessage) => {
  await admin.messaging().sendEachForMulticast(message);
};

export default sendPushNotification;
