import type { GraphqlUploadsConfig } from "@prefabs.tech/fastify-graphql";
import type { FastifyInstance } from "fastify";

import {
  graphqlUploadTransport,
  UPLOAD_TRANSPORT_PLUGIN_NAME,
} from "@prefabs.tech/fastify-graphql";
import fastifyPlugin from "fastify-plugin";

type MultipartParserOptions = GraphqlUploadsConfig & {
  path?: string;
};

// Deprecated compat wrapper: the upload transport now lives in
// @prefabs.tech/fastify-graphql and is registered by the graphql plugin
// (uploads option). Removed in the next major.
const plugin = async (
  fastify: FastifyInstance,
  options: MultipartParserOptions,
) => {
  fastify.log.warn(
    "multipartParserPlugin from @prefabs.tech/fastify-s3 is deprecated: the GraphQL upload transport is registered by the graphql plugin (uploads option).",
  );

  if (fastify.hasPlugin(UPLOAD_TRANSPORT_PLUGIN_NAME)) {
    return;
  }

  await fastify.register(graphqlUploadTransport, {
    ...options,
    path: options.path ?? fastify.config?.graphql?.path,
  });
};

export default fastifyPlugin(plugin);
