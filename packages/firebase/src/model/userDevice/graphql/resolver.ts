import { mercurius, MercuriusContext } from "mercurius";

import Service from "../service";

const Mutation = {
  addUserDevice: async (
    parent: unknown,
    arguments_: {
      data: {
        deviceToken: string;
      };
    },
    context: MercuriusContext,
  ) => {
    const { app, config, database, dbSchema, user } = context;

    if (config.firebase.enabled === false) {
      return new mercurius.ErrorWithProps("Firebase is not enabled", {}, 404);
    }

    if (!user) {
      return new mercurius.ErrorWithProps("unauthorized", {}, 401);
    }

    try {
      const { deviceToken } = arguments_.data;

      const service = new Service(config, database, dbSchema);

      return await service.create({ deviceToken, userId: user.id });
    } catch (error) {
      app.log.error(error);

      return new mercurius.ErrorWithProps(
        "Oops, Something went wrong",
        {},
        500,
      );
    }
  },
  removeUserDevice: async (
    parent: unknown,
    arguments_: {
      data: {
        deviceToken: string;
      };
    },
    context: MercuriusContext,
  ) => {
    const { app, config, database, dbSchema, user } = context;

    if (config.firebase.enabled === false) {
      return new mercurius.ErrorWithProps("Firebase is not enabled", {}, 404);
    }

    if (!user) {
      return new mercurius.ErrorWithProps("unauthorized", {}, 401);
    }

    try {
      const { deviceToken } = arguments_.data;

      const service = new Service(config, database, dbSchema);

      const userDevices = await service.getByUserId(user.id);

      if (!userDevices || userDevices.length === 0) {
        return new mercurius.ErrorWithProps(
          "No devices found for user",
          {},
          403,
        );
      }

      const deviceToDelete = userDevices.find(
        (device) => device.deviceToken === deviceToken,
      );

      if (!deviceToDelete) {
        return new mercurius.ErrorWithProps(
          "Device requested to delete not owned by user",
          {},
          403,
        );
      }

      return await service.removeByDeviceToken(deviceToken);
    } catch (error) {
      app.log.error(error);

      return new mercurius.ErrorWithProps(
        "Oops, Something went wrong",
        {},
        500,
      );
    }
  },
};

const Query = {};

export default { Mutation, Query };
