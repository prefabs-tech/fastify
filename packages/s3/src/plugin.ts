import type { FastifyInstance } from "fastify";

import fastifyMultiPart from "@fastify/multipart";
import FastifyPlugin from "fastify-plugin";

import runMigrations from "./migrations/runMigrations";
import graphqlGQLUpload from "./plugins/graphqlUpload";

const plugin = async (fastify: FastifyInstance) => {
  fastify.log.info("Registering fastify-s3 plugin");

  const { config, slonik } = fastify;

  await runMigrations(slonik, config);

  if (config.rest.enabled) {
    await fastify.register(fastifyMultiPart, {
      attachFieldsToBody: "keyValues",
      limits: {
        fileSize: config.s3.fileSizeLimitInBytes || Number.POSITIVE_INFINITY,
      },
      async onFile(part) {
        // @ts-expect-error: data value and data is missing in MultipartFile type
        part.value = {
          data: await part.toBuffer(),
          encoding: part.encoding,
          filename: part.filename,
          mimetype: part.mimetype,
        };
      },
      sharedSchemaId: "fileSchema",
    });
  }

  if (config.graphql?.enabled) {
    await fastify.register(graphqlGQLUpload, {
      maxFileSize: config.s3.fileSizeLimitInBytes || Number.POSITIVE_INFINITY,
    });
  }
};

export default FastifyPlugin(plugin);
