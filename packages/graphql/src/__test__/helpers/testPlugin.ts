import type { FastifyInstance } from "fastify";
import type { MercuriusContext } from "mercurius";

import FastifyPlugin from "fastify-plugin";

import type { GraphqlEnabledPlugin } from "../../types";

declare module "mercurius" {
  interface MercuriusContext {
    propertyTwo: string;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    propertyTwo: string;
  }
}

const plugin = FastifyPlugin(
  (fastify: FastifyInstance, options: unknown, done: () => void) => {
    fastify.decorate("propertyTwo", "Property Two");
    done();
  },
) as GraphqlEnabledPlugin;

plugin.updateContext = async (context: MercuriusContext) => {
  context.propertyTwo = "Property Two";
};

export default plugin;
