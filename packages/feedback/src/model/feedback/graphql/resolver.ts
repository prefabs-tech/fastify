import { mercurius, MercuriusContext } from "mercurius";

import type { FeedbackCreateInput } from "../../../types";

import Service from "../service";

const Mutation = {
  createFeedback: async (
    parent: unknown,
    arguments_: {
      data: FeedbackCreateInput;
    },
    context: MercuriusContext,
  ) => {
    const { app, config, database, dbSchema, user } = context;

    if (config.feedback.enabled === false) {
      return new mercurius.ErrorWithProps("Feedback is not enabled", {}, 404);
    }

    if (!user) {
      return new mercurius.ErrorWithProps("unauthorized", {}, 401);
    }

    try {
      const { appVersion, deviceModel, message, platform, typeId } =
        arguments_.data;

      const service = new Service(config, database, dbSchema);

      return await service.create({
        appVersion,
        deviceModel,
        message,
        platform,
        typeId,
        userId: user.id,
      });
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
