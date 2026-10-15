import type { FastifyInstance } from "fastify";

import type { User } from "../types";

const withGrants = async <T extends User>(
  user: T,
  fastify: FastifyInstance,
): Promise<T> => {
  const getGrants = fastify.config.user.accessControl?.getGrants;

  if (!getGrants) {
    return user;
  }

  return { ...user, grants: await getGrants(user, fastify) };
};

export default withGrants;
