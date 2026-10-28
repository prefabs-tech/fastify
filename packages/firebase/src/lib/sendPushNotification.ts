import type { MulticastMessage } from "firebase-admin/messaging";

import admin from "firebase-admin";

const sendPushNotification = async (message: MulticastMessage) => {
  await admin.messaging().sendEachForMulticast(message);
};

export default sendPushNotification;
