import type { Invitation } from "../types/invitation.js";

const isInvitationValid = (invitation: Invitation): boolean => {
  return !(
    invitation.acceptedAt ||
    invitation.revokedAt ||
    Date.now() > invitation.expiresAt
  );
};

export default isInvitationValid;
