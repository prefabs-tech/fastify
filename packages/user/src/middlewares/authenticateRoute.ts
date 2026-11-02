import type { FastifyReply, FastifyRequest } from "fastify";

const authenticateRoute = async (
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  // A request that matches no route includes SuperTokens' own /auth endpoints,
  // which its plugin answers; checking it would also turn a 404 into a 401.
  if (request.is404 || request.routeOptions.config.public === true) {
    return;
  }

  // verifySession reads route config `verified` and `profileValidated` through
  // the global claim validators, so routes drop a claim without options here.
  await request.server.verifySession()(request, reply);
};

export default authenticateRoute;
