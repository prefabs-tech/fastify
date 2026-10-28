/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import type { ApiConfig } from "@prefabs.tech/fastify-config";

import type { FastifyMailer, MailerConfig } from "./types.js";

declare module "fastify" {
  interface FastifyInstance {
    mailer: FastifyMailer;
  }
}

declare module "@prefabs.tech/fastify-config" {
  interface ApiConfig {
    mailer: MailerConfig;
  }
}

export { default } from "./plugin.js";

export type {
  FastifyMailer,
  FastifyMailerNamedInstance,
  MailerConfig,
} from "./types.js";
