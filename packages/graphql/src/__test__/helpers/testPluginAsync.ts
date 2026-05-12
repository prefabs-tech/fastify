import type { FastifyInstance } from "fastify";
import type { MercuriusContext } from "mercurius";

import FastifyPlugin from "fastify-plugin";

import type { GraphqlEnabledPlugin } from "../../types";

declare module "mercurius" {
  interface MercuriusContext {
    propertyOne: string;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    propertyOne: string;
  }
}

const plugin = FastifyPlugin(async (fastify: FastifyInstance) => {
  fastify.decorate("propertyOne", "Property One");
}) as unknown as GraphqlEnabledPlugin;

plugin.updateContext = async (context: MercuriusContext) => {
  context.propertyOne = "Property One";
};

export default plugin;
