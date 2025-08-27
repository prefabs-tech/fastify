import type { GraphqlConfig } from "./types";
import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { Database } from "@prefabs.tech/fastify-slonik";

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

export { default } from "./plugin";
export { gql } from "graphql-tag";
export { mergeTypeDefs } from "@graphql-tools/merge";
export { default as baseSchema } from "./baseSchema";

export type {
  GraphqlConfig,
  GraphqlEnabledPlugin,
  GraphqlOptions,
} from "./types";
export type { DocumentNode } from "graphql";
