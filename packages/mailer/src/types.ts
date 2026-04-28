import type { Transporter } from "nodemailer";
import type { IPluginOptions } from "nodemailer-mjml";
import type { Options } from "nodemailer/lib/mailer/";
import type { Options as SMTPOptions } from "nodemailer/lib/smtp-transport";

type FastifyMailer = FastifyMailerNamedInstance & Transporter;

interface FastifyMailerNamedInstance {
  [namespace: string]: Transporter;
}

interface MailerConfig {
  defaults: {
    from: {
      address: string;
      name: string;
    };
  } & Partial<Options>;
  /**
   * Any email sent from the API will be directed to these addresses.
   */
  recipients?: string[];
  templateData?: Record<never, never>;
  templating: IPluginOptions;
  test?: {
    enabled: boolean;
    path: string;
    to: string;
  };
  transport: SMTPOptions;
}

type MailerOptions = MailerConfig;

export type {
  FastifyMailer,
  FastifyMailerNamedInstance,
  MailerConfig,
  MailerOptions,
};
