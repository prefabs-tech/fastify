import type { FastifyInstance } from "fastify";

import fastifyPlugin from "fastify-plugin";

import type { MultipartParserOptions } from "../types";

import { DEFAULT_GRAPHQL_PATH } from "../constants";
import { processMultipartFormData } from "../utils";

declare module "fastify" {
  interface FastifyRequest {
    graphqlFileUploadMultipart?: boolean;
  }
}

const plugin = async (
  fastify: FastifyInstance,
  options: MultipartParserOptions,
) => {
  if (Object.keys(options).length === 0) {
    fastify.log.warn(
      "The multipart parser plugin now recommends passing graphql options directly to the plugin.",
    );
  }

  fastify.addContentTypeParser("*", (req, _payload, done) => {
    const contentType = req.headers["content-type"] || "";
    const graphql = options.graphql ?? req.config?.graphql;

    if (contentType.includes("multipart")) {
      if (
        graphql?.enabled &&
        req.routeOptions.url?.startsWith(graphql.path ?? DEFAULT_GRAPHQL_PATH)
      ) {
        req.graphqlFileUploadMultipart = true;
      } else {
        processMultipartFormData(req, _payload, done);
      }
    }

    // eslint-disable-next-line unicorn/no-null
    done(null);
  });
};

export default fastifyPlugin(plugin);
