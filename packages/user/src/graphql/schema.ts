import { baseSchema, mergeTypeDefs } from "@prefabs.tech/fastify-graphql";

import invitationSchema from "../model/invitations/graphql/schema.js";
import roleSchema from "../model/roles/graphql/schema.js";
import userSchema from "../model/users/graphql/schema.js";

export default mergeTypeDefs([
  baseSchema,
  invitationSchema,
  roleSchema,
  userSchema,
]);
