import getInvitationLink from "./getInvitationLink";
import getOrigin from "./getOrigin";
import sendEmail from "./sendEmail";

import type { Invitation } from "../types/invitation";
import type { FastifyInstance } from "fastify";

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
        invitationLink: getInvitationLink(config, invitation, origin),
        invitation,
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
