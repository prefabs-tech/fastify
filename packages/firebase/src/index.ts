import type { FastifyReply } from "fastify";

import type { User } from "./types.js";

import notificationHandlers from "./model/notification/handlers/index.js";
import deviceHandlers from "./model/userDevice/handlers/index.js";

declare module "fastify" {
  interface FastifyInstance {
    verifySession: (options?: {
      sessionRequired?: boolean;
    }) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    user?: User;
  }
}

declare module "mercurius" {
  interface MercuriusContext {
    user: User;
  }
}

declare module "@prefabs.tech/fastify-config" {
  interface ApiConfig {
    firebase: {
      appCheck?: {
        enabled?: boolean;
        routes?: string[];
      };
      credentials?: {
        clientEmail: string;
        privateKey: string;
        projectId: string;
      };
      enabled?: boolean;
      handlers?: {
        notification?: {
          sendNotification?: typeof notificationHandlers.sendNotification;
        };
        userDevice?: {
          addUserDevice?: typeof deviceHandlers.addUserDevice;
          removeUserDevice?: typeof deviceHandlers.removeUserDevice;
        };
      };
      notification?: {
        test?: {
          enabled: boolean;
          path: string;
        };
      };
      routePrefix?: string;
      routes?: {
        notifications?: {
          disabled: boolean;
        };
        userDevices?: {
          disabled: boolean;
        };
      };
      table?: {
        userDevices?: {
          name: string;
        };
      };
    };
  }
}

export * from "./constants.js";

export { default as firebaseSchema } from "./graphql/schema.js";
export * from "./lib/index.js";

export { default as verifyFirebaseAppCheck } from "./middlewares/verifyFirebaseAppCheck.js";
export * from "./migrations/queries.js";
export { default as notificationRoutes } from "./model/notification/controller.js";
export { default as notificationResolver } from "./model/notification/graphql/resolver.js";
export { default as userDeviceRoutes } from "./model/userDevice/controller.js";

export { default as userDeviceResolver } from "./model/userDevice/graphql/resolver.js";
export { default as UserDeviceService } from "./model/userDevice/service.js";
export { default } from "./plugin.js";
export { getAppCheck } from "firebase-admin/app-check";
