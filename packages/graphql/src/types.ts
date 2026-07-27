import type {
  FastifyPluginAsync,
  FastifyPluginCallback,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import type { UploadOptions } from "graphql-upload-minimal";
import type { MercuriusContext, MercuriusOptions } from "mercurius";

export interface GraphqlConfig extends MercuriusOptions {
  enabled?: boolean;
  plugins?: GraphqlEnabledPlugin[];
  uploads?: GraphqlUploadsConfig;
}

export interface GraphqlEnabledPlugin
  extends FastifyPluginAsync, FastifyPluginCallback {
  updateContext: (
    context: MercuriusContext,
    request: FastifyRequest,
    reply: FastifyReply,
  ) => Promise<void>;
}

export type GraphqlOptions = GraphqlConfig;

export interface GraphqlUploadsConfig extends UploadOptions {
  enabled?: boolean;
}

export interface MultipartFile {
  data: Buffer;
  encoding?: string;
  filename: string;
  mimetype: string;
}
