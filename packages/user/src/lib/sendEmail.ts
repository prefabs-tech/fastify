// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { FastifyMailer } from "@prefabs.tech/fastify-mailer";
import type { FastifyInstance } from "fastify";

const sendEmail = async ({
  fastify,
  subject,
  templateData = {},
  templateName,
  to,
}: {
  fastify: FastifyInstance;
  subject: string;
  templateData?: Record<never, never>;
  templateName: string;
  to: string;
}) => {
  const { config, log, mailer } = fastify;

  return mailer
    .sendMail({
      subject: subject,
      templateData: {
        appName: config.appName,
        ...templateData,
      },
      templateName: templateName,
      to: to,
    })
    .catch((error: Error) => {
      log.error(error.stack);
    });
};

export default sendEmail;
