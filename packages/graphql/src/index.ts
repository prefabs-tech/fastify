import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { Database } from "@prefabs.tech/fastify-slonik";

import type { GraphqlConfig } from "./types";

declare module "mercurius" {
  interface MercuriusContext {
    config: ApiConfig;
    database: Database;
    dbSchema: string;
  }
}

declare module "@prefabs.tech/fastify-config" {
  interface ApiConfig {
    graphql: GraphqlConfig;
  }
}

export { default as baseSchema } from "./baseSchema";
export { default } from "./plugin";
export type {
  GraphqlConfig,
  GraphqlEnabledPlugin,
  GraphqlOptions,
} from "./types";
export { mergeTypeDefs } from "@graphql-tools/merge";

export type { DocumentNode } from "graphql";
export { gql } from "graphql-tag";
