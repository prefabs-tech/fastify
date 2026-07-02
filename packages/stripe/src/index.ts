import Stripe from "stripe";

import { StripeConfig } from "./types";

declare module "@prefabs.tech/fastify-config" {
  interface ApiConfig {
    stripe?: StripeConfig;
  }
}

export * from "./constants";
export { default } from "./plugin";
export type { StripeConfig, StripeEventHandlers } from "./types";
export type StripeEvent = Stripe.Event;
export * from "./utils";
