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

declare module "fastify" {
  interface FastifyRequest {
    graphqlFileUploadMultipart?: boolean;
  }
}

export { default as baseSchema } from "./baseSchema";

export * from "./constants";
export { default } from "./plugin";
export type {
  GraphqlConfig,
  GraphqlEnabledPlugin,
  GraphqlOptions,
  GraphqlUploadsConfig,
  MultipartFile,
} from "./types";
export { default as graphqlUploadTransport } from "./uploads/transport";
export { mergeTypeDefs } from "@graphql-tools/merge";

export type { DocumentNode } from "graphql";
export { gql } from "graphql-tag";
export type {
  FileUpload as GraphQLFileUpload,
  Upload as GraphQLUpload,
} from "graphql-upload-minimal";
