import fastifyPlugin from "fastify-plugin";

import { processMultipartFormData } from "../utils";

import type { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    graphqlFileUploadMultipart?: boolean;
  }
}

const plugin = async (fastify: FastifyInstance) => {
  fastify.addContentTypeParser("*", (req, _payload, done) => {
    const contentType = req.headers["content-type"] || "";

    if (contentType.includes("multipart")) {
      if (
        req.config.graphql?.enabled &&
        req.routeOptions.url?.startsWith(req.config.graphql.path as string)
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
