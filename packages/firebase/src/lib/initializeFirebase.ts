import { initializeApp, credential, apps } from "firebase-admin";

import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { FastifyInstance } from "fastify";

const initializeFirebase = (config: ApiConfig, fastify: FastifyInstance) => {
  if (apps.length > 0) {
    return;
  }

  if (config.firebase?.enabled !== false && !config.firebase.credentials) {
    fastify.log.error("Firebase credentials are missing");
    return;
  }

  try {
    initializeApp({
      credential: credential.cert({
        projectId: config.firebase.credentials?.projectId,
        privateKey: config.firebase.credentials?.privateKey.replaceAll(
          String.raw`\n`,
          "\n",
        ),
        clientEmail: config.firebase.credentials?.clientEmail,
      }),
    });
  } catch (error) {
    fastify.log.error("Failed to initialize firebase");
    fastify.log.error(error);
  }
};

export default initializeFirebase;
