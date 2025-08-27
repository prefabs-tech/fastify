import { verifySession } from "supertokens-node/recipe/session/framework/fastify";

import notificationHandlers from "./model/notification/handlers";
import deviceHandlers from "./model/userDevice/handlers";

import type { User } from "./types";

declare module "fastify" {
  interface FastifyInstance {
    verifySession: typeof verifySession;
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
      enabled?: boolean;
      credentials?: {
        projectId: string;
        privateKey: string;
        clientEmail: string;
      };
      routes?: {
        notifications?: {
          disabled: boolean;
        };
        userDevices?: {
          disabled: boolean;
        };
      };
      routePrefix?: string;
      table?: {
        userDevices?: {
          name: string;
        };
      };
      notification?: {
        test?: {
          enabled: boolean;
          path: string;
        };
      };
      handlers?: {
        userDevice?: {
          addUserDevice?: typeof deviceHandlers.addUserDevice;
          removeUserDevice?: typeof deviceHandlers.removeUserDevice;
        };
        notification?: {
          sendNotification?: typeof notificationHandlers.sendNotification;
        };
      };
    };
  }
}

export { default } from "./plugin";

export { default as notificationRoutes } from "./model/notification/controller";
export { default as notificationResolver } from "./model/notification/graphql/resolver";

export { default as userDeviceResolver } from "./model/userDevice/graphql/resolver";
export { default as userDeviceRoutes } from "./model/userDevice/controller";
export { default as UserDeviceService } from "./model/userDevice/service";
export { default as firebaseSchema } from "./graphql/schema";

export * from "./constants";
export * from "./lib";
export * from "./migrations/queries";
