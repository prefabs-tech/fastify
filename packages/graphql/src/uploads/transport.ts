import type { FastifyInstance } from "fastify";

import fastifyPlugin from "fastify-plugin";
import { processRequest } from "graphql-upload-minimal";

import type { GraphqlUploadsConfig } from "../types";

import {
  DEFAULT_GRAPHQL_PATH,
  UPLOAD_TRANSPORT_PLUGIN_NAME,
} from "../constants";
import { processMultipartFormData } from "./processMultipartFormData";

type UploadTransportOptions = GraphqlUploadsConfig & {
  path?: string;
};

const plugin = async (
  fastify: FastifyInstance,
  options: UploadTransportOptions,
) => {
  const { path, ...uploadOptions } = options;
  const graphqlPath = path ?? DEFAULT_GRAPHQL_PATH;

  fastify.addContentTypeParser("*", (req, payload, done) => {
    const contentType = req.headers["content-type"] || "";

    if (contentType.includes("multipart")) {
      if (req.routeOptions.url?.startsWith(graphqlPath)) {
        req.graphqlFileUploadMultipart = true;
      } else {
        // busboy calls done itself once the body is fully parsed
        processMultipartFormData(req, payload, done);

        return;
      }
    }

    // eslint-disable-next-line unicorn/no-null
    done(null);
  });

  fastify.addHook("preValidation", async (request, reply) => {
    if (!request.graphqlFileUploadMultipart) {
      return;
    }

    request.body = await processRequest(request.raw, reply.raw, uploadOptions);
  });
};

export default fastifyPlugin(plugin, {
  fastify: ">= 4.x",
  name: UPLOAD_TRANSPORT_PLUGIN_NAME,
});
