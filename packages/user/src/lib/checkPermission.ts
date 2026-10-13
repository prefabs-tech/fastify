import type { FastifyRequest } from "fastify";

import hasUserPermission from "./hasUserPermission";

const checkPermission = async (
  request: FastifyRequest,
  permission: string,
  // Without one, only unconditional grants count: a back-end check never asks
  // "on some object?"
  context: Record<string, unknown> = {},
): Promise<boolean> => {
  const user = request.user;

  if (!user) {
    return false;
  }

  const hasPermission = request.server.config.user.hasPermission;

  if (hasPermission) {
    return (await hasPermission(request, permission, context)) === true;
  }

  return hasUserPermission(request.server, user.id, permission);
};

export default checkPermission;
