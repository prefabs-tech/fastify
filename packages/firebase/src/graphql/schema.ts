import { baseSchema, mergeTypeDefs } from "@prefabs.tech/fastify-graphql";

import notificationSchema from "../model/notification/graphql/schema";
import userDeviceSchema from "../model/userDevice/graphql/schema";

export default mergeTypeDefs([
  baseSchema,
  notificationSchema,
  userDeviceSchema,
]);
