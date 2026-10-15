import type { FastifyReply, FastifyRequest } from "fastify";

import { getAppCheck } from "firebase-admin/app-check";

const verifyFirebaseAppCheck = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  if (!request.config.firebase.appCheck?.enabled) {
    return;
  }

  const PROTECTED_ROUTES = new Set(request.config.firebase.appCheck?.routes);

  try {
    if (!PROTECTED_ROUTES.has(request.url.split("?", 1)[0])) {
      return;
    }

    const appCheckHeader = request.headers["x-firebase-appcheck"];

    if (!appCheckHeader || Array.isArray(appCheckHeader)) {
      return reply.status(403).send({
        code: "FORBIDDEN",
        message: "You aren't authorized to access this resource",
      });
    }

    await getAppCheck().verifyToken(appCheckHeader);
  } catch (error) {
    request.log.error(`Error verifying Firebase App Check token: ${error}`);

    return reply.status(403).send({
      code: "FORBIDDEN",
      message: "You aren't authorized to access this resource",
    });
  }
};

export default verifyFirebaseAppCheck;
