import type { FastifyInstance } from "fastify";

import type { Invitation } from "../types/invitation.js";

import getInvitationLink from "./getInvitationLink.js";
import getOrigin from "./getOrigin.js";
import sendEmail from "./sendEmail.js";

const sendInvitation = async (
  fastify: FastifyInstance,
  invitation: Invitation,
  url?: string,
) => {
  const { config, log } = fastify;

  const origin =
    config.apps?.find((app) => app.id === invitation.appId)?.origin ||
    getOrigin(url || "") ||
    config.appOrigin[0];

  if (origin) {
    sendEmail({
      fastify,
      subject:
        config.user.emailOverrides?.invitation?.subject ||
        "Invitation for sign up",
      templateData: {
        invitation,
        invitationLink: getInvitationLink(config, invitation, origin),
      },
      templateName:
        config.user.emailOverrides?.invitation?.templateName ||
        "user-invitation",
      to: invitation.email,
    });
  } else {
    log.error(`Could not send email for invitation id ${invitation.id}`);
  }
};

export default sendInvitation;
