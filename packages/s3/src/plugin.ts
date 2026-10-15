import type { FastifyInstance } from "fastify";

import fastifyMultiPart from "@fastify/multipart";
import FastifyPlugin from "fastify-plugin";

import type { S3Options } from "./types";

import runMigrations from "./migrations/runMigrations";

// Partial so the deprecated no-options registration still compiles; the
// parameter becomes a required S3Options once the fastify.config fallback is
// removed.
const plugin = async (
  fastify: FastifyInstance,
  options: Partial<S3Options>,
) => {
  fastify.log.info("Registering fastify-s3 plugin");

  if (!fastify.slonik) {
    throw new Error(
      "Missing slonik decorator. Did you forget to register the slonik plugin before the s3 plugin?",
    );
  }

  if (Object.keys(options).length === 0) {
    fastify.log.warn(
      "The s3 plugin now recommends passing s3 options directly to the plugin.",
    );

    if (!fastify.config?.s3) {
      throw new Error(
        "Missing s3 configuration. Did you forget to pass it to the s3 plugin?",
      );
    }

    options = {
      ...fastify.config.s3,
      rest: fastify.config.rest,
    };
  }

  await runMigrations(fastify.slonik, options);

  if (options.rest?.enabled) {
    await fastify.register(fastifyMultiPart, {
      attachFieldsToBody: "keyValues",
      limits: {
        fileSize: options.fileSizeLimitInBytes || Infinity,
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
};

export default FastifyPlugin(plugin);
