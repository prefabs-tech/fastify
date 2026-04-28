import type { MercuriusContext } from "mercurius";

import { mercurius } from "mercurius";

const Query = {
  permissions: async (
    parent: unknown,
    arguments_: Record<string, never>,
    context: MercuriusContext,
  ) => {
    const { app, config } = context;

    try {
      const permissions: string[] = config.user.permissions || [];

      return permissions;
    } catch (error) {
      app.log.error(error);

      const mercuriusError = new mercurius.ErrorWithProps(
        "Oops, Something went wrong",
      );

      mercuriusError.statusCode = 500;

      return mercuriusError;
    }
  },
};

export default { Query };
