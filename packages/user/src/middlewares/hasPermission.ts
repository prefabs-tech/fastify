import type { SessionRequest } from "supertokens-node/framework/fastify";

import { Error as STError } from "supertokens-node/recipe/session";
import UserRoles from "supertokens-node/recipe/userroles";

import hasUserPermission from "../lib/hasUserPermission";

const hasPermission =
  (permission: string) =>
  async (request: SessionRequest): Promise<void> => {
    const user = request.user;

    if (!user) {
      throw new STError({
        message: "unauthorised",
        type: "UNAUTHORISED",
      });
    }

    if (!(await hasUserPermission(request.server, user.id, permission))) {
      // this error tells SuperTokens to return a 403 http response.
      throw new STError({
        message: "Not have enough permission",
        payload: [
          {
            id: UserRoles.PermissionClaim.key,
            reason: {
              expectedToInclude: permission,
              message: "Not have enough permission",
            },
          },
        ],
        type: "INVALID_CLAIMS",
      });
    }
  };

export default hasPermission;
