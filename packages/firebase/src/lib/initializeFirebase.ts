import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { FastifyInstance } from "fastify";

import admin from "firebase-admin";

const initializeFirebase = (config: ApiConfig, fastify: FastifyInstance) => {
  if (admin.apps.length > 0) {
    return;
  }

  if (config.firebase?.enabled !== false && !config.firebase.credentials) {
    fastify.log.error("Firebase credentials are missing");
    return;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        clientEmail: config.firebase.credentials?.clientEmail,
        privateKey: config.firebase.credentials?.privateKey.replaceAll(
          String.raw`\n`,
          "\n",
        ),
        projectId: config.firebase.credentials?.projectId,
      }),
    });
  } catch (error) {
    fastify.log.error("Failed to initialize firebase");
    fastify.log.error(error);
  }
};

export default initializeFirebase;
