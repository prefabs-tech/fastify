import { verifySession } from "supertokens-node/recipe/session/framework/fastify";

import type { User } from "./types";

import feedbackHandlers from "./model/feedback/handlers";

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
    feedback: {
      enabled?: boolean;
      handlers?: {
        feedback?: {
          createFeedback?: typeof feedbackHandlers.createFeedback;
        };
      };
      routePrefix?: string;
      routes?: {
        feedbacks?: {
          disabled: boolean;
        };
      };
      table?: {
        feedbacks?: {
          name: string;
        };
      };
    };
  }
}

export * from "./constants";

export { default as feedbackSchema } from "./graphql/schema";
export * from "./migrations/queries";

export { default as feedbackRoutes } from "./model/feedback/controller";
export { default as feedbackResolver } from "./model/feedback/graphql/resolver";
export { default as FeedbackService } from "./model/feedback/service";

export { default } from "./plugin";

export type * from "./types";
