import type { FastifyRequest } from "fastify";

import { Error as STError } from "supertokens-node/recipe/session";
import UserRoles from "supertokens-node/recipe/userroles";

import checkPermission from "../lib/checkPermission";

interface HasPermissionOptions {
  context?: (
    request: FastifyRequest,
  ) => Promise<Record<string, unknown>> | Record<string, unknown>;
}

const hasPermission =
  (permission: string, options?: HasPermissionOptions) =>
  async (request: FastifyRequest): Promise<void> => {
    const user = request.user;

    if (!user) {
      throw new STError({
        message: "unauthorised",
        type: "UNAUTHORISED",
      });
    }

    const context = options?.context ? await options.context(request) : {};

    if (!(await checkPermission(request, permission, context))) {
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
