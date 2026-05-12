/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import type { ApiConfig } from "@prefabs.tech/fastify-config";

import type { FastifyMailer, MailerConfig } from "./types";

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

export { default } from "./plugin";

export type {
  FastifyMailer,
  FastifyMailerNamedInstance,
  MailerConfig,
} from "./types";
