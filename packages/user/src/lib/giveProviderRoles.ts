import type { FastifyInstance, FastifyRequest } from "fastify";

/**
 * Gives the access-control library's roles that `roleMap` maps the given
 * SuperTokens roles to, keeping any the user already holds. The account exists
 * by now, so a failure is logged rather than thrown: a missing role only
 * withholds permissions.
 */
const giveProviderRoles = async (
  fastify: FastifyInstance,
  request: FastifyRequest | undefined,
  userId: string,
  supertokensRoles: string[],
): Promise<void> => {
  const { admin, roleMap } = fastify.config.user.accessControl ?? {};

  if (!admin || !roleMap) {
    return;
  }

  // A Map, so that a role named like an Object.prototype key maps to nothing.
  const mapped = new Map(Object.entries(roleMap));

  const roles = [
    ...new Set(supertokensRoles.flatMap((role) => mapped.get(role) ?? [])),
  ];

  if (roles.length === 0) {
    return;
  }

  // admin works in the request's database schema, so it can't run without one.
  if (!request) {
    fastify.log.warn(
      { roles, userId },
      "Access-control roles not given: sign-up was called without a request",
    );

    return;
  }

  try {
    const current = await admin.getUserRoles(request, userId);

    if (roles.every((role) => current.includes(role))) {
      return;
    }

    await admin.setUserRoles(request, userId, [
      ...new Set([...current, ...roles]),
    ]);
  } catch (error) {
    fastify.log.error(
      { err: error, roles, userId },
      "Access-control roles not given",
    );
  }
};

export default giveProviderRoles;
