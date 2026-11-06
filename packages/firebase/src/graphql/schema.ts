import { baseSchema, mergeTypeDefs } from "@prefabs.tech/fastify-graphql";

import notificationSchema from "../model/notification/graphql/schema.js";
import userDeviceSchema from "../model/userDevice/graphql/schema.js";

export default mergeTypeDefs([
  baseSchema,
  notificationSchema,
  userDeviceSchema,
]);
