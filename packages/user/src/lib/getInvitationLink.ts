import type { ApiConfig } from "@prefabs.tech/fastify-config";

import type { Invitation } from "../types/invitation.js";

import { INVITATION_ACCEPT_LINK_PATH } from "../constants.js";
import getAppLinkPath from "./getAppLinkPath.js";

const getInvitationLink = (
  config: ApiConfig,
  invitation: Invitation,
  origin: string,
): string => {
  const { appId, token } = invitation;

  const app =
    appId === undefined
      ? undefined
      : config.apps?.find((app) => app.id === appId);

  const appPath = getAppLinkPath(app, "invitationAccept");

  const invitationAcceptPath = appPath
    ? `${appPath.replace(/\/+$/, "")}/${token}`
    : (
        config.user.invitation?.acceptLinkPath || INVITATION_ACCEPT_LINK_PATH
      ).replaceAll(/:token(?!\w)/g, token);

  const url = new URL(invitationAcceptPath, origin);

  return url.href;
};

export default getInvitationLink;
