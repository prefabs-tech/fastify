import { INVITATION_ACCEPT_LINK_PATH } from "../constants";

import type { Invitation } from "../types/invitation";
import type { ApiConfig } from "@prefabs.tech/fastify-config";

const getInvitationLink = (
  config: ApiConfig,
  invitation: Invitation,
  origin: string,
): string => {
  const { token } = invitation;

  let invitationAcceptPath =
    config.user.invitation?.acceptLinkPath || INVITATION_ACCEPT_LINK_PATH;

  invitationAcceptPath = invitationAcceptPath.replaceAll(
    /:token(?!\w)/g,
    token,
  );

  const url = new URL(invitationAcceptPath, origin);

  return url.href;
};

export default getInvitationLink;
