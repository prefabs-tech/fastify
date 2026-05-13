import type { FastifyInstance } from "fastify";
import type { MailOptions } from "nodemailer/lib/sendmail-transport";

import FastifyPlugin from "fastify-plugin";
import { createTransport } from "nodemailer";
import { htmlToText } from "nodemailer-html-to-text";
import { nodemailerMjmlPlugin } from "nodemailer-mjml";
import SMTPTransport from "nodemailer/lib/smtp-transport";

import type { FastifyMailer, MailerOptions } from "./types";

import router from "./router";

const plugin = async (fastify: FastifyInstance, options: MailerOptions) => {
  fastify.log.info("Registering fastify-mailer plugin");

  if (Object.keys(options).length === 0) {
    fastify.log.warn(
      "The mailer plugin now recommends passing mailer options directly to the plugin.",
    );

    if (!fastify.config?.mailer) {
      throw new Error(
        "Missing mailer configuration. Did you forget to pass it to the mailer plugin?",
      );
    }

    options = fastify.config.mailer;
  }

  const {
    defaults,
    recipients,
    templateData: configTemplateData,
    templating,
    test,
    transport,
  } = options;

  const transporter = createTransport(transport, defaults);

  transporter.use(
    "compile",
    nodemailerMjmlPlugin({
      templateFolder: templating.templateFolder,
    }),
  );

  transporter.use("compile", htmlToText());

  const mailer = {
    ...transporter,
    sendMail: async (
      userOptions: MailOptions,
      callback?: (
        err: Error | null,
        info: SMTPTransport.SentMessageInfo,
      ) => void,
    ) => {
      let templateData = {};

      if (configTemplateData) {
        templateData = { ...templateData, ...configTemplateData };
      }

      if (userOptions.templateData) {
        templateData = { ...templateData, ...userOptions.templateData };
      }

      let mailerOptions = {
        ...userOptions,
        templateData: {
          ...templateData,
        },
      };

      if (recipients && recipients.length > 0) {
        mailerOptions = {
          ...mailerOptions,
          bcc: undefined,
          cc: undefined,
          to: recipients,
        };
      }

      if (callback) {
        return transporter.sendMail(mailerOptions, callback);
      }

      return transporter.sendMail(mailerOptions);
    },
  } as FastifyMailer;

  if (fastify.mailer) {
    throw new Error("fastify-mailer has already been registered");
  } else {
    fastify.decorate("mailer", mailer);
  }

  if (test && test?.enabled) {
    const { path, to } = test;

    await fastify.register(router, { path, to });
  }
};

export default FastifyPlugin(plugin);
