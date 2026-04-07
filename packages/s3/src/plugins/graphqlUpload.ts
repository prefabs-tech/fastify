import type { FastifyPluginCallback } from "fastify";

import fastifyPlugin from "fastify-plugin";
import { processRequest, UploadOptions } from "graphql-upload-minimal";

declare module "fastify" {
  interface FastifyRequest {
    graphqlFileUploadMultipart?: boolean;
  }
}

const plugin: FastifyPluginCallback<UploadOptions> = (
  fastify,
  options,
  done,
) => {
  fastify.addHook("preValidation", async (request, reply) => {
    if (!request.graphqlFileUploadMultipart) {
      return;
    }

    request.body = await processRequest(request.raw, reply.raw, options);
  });

  done();
};

export const mercuriusUpload = fastifyPlugin(plugin, {
  fastify: ">= 4.x",
  name: "mercurius-upload",
});

export default mercuriusUpload;
