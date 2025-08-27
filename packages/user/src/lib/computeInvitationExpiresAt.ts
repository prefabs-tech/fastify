import { formatDate } from "@prefabs.tech/fastify-slonik";

import { INVITATION_EXPIRE_AFTER_IN_DAYS } from "../constants";

import type { ApiConfig } from "@prefabs.tech/fastify-config";

const computeInvitationExpiresAt = (config: ApiConfig, expireTime?: string) => {
  return (
    expireTime ||
    formatDate(
      new Date(
        Date.now() +
          (config.user.invitation?.expireAfterInDays ??
            INVITATION_EXPIRE_AFTER_IN_DAYS) *
            (24 * 60 * 60 * 1000),
      ),
    )
  );
};

export default computeInvitationExpiresAt;
