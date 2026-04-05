import { verifySession } from "supertokens-node/recipe/session/framework/fastify";

import type { User } from "./types";

import notificationHandlers from "./model/notification/handlers";
import deviceHandlers from "./model/userDevice/handlers";

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

export * from "./constants";

export { default as firebaseSchema } from "./graphql/schema";
export * from "./lib";

export * from "./migrations/queries";
export { default as notificationRoutes } from "./model/notification/controller";
export { default as notificationResolver } from "./model/notification/graphql/resolver";
export { default as userDeviceRoutes } from "./model/userDevice/controller";

export { default as userDeviceResolver } from "./model/userDevice/graphql/resolver";
export { default as UserDeviceService } from "./model/userDevice/service";
export { default } from "./plugin";
