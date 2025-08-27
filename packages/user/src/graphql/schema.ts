import { mergeTypeDefs, baseSchema } from "@prefabs.tech/fastify-graphql";

import invitationSchema from "../model/invitations/graphql/schema";
import roleSchema from "../model/roles/graphql/schema";
import userSchema from "../model/users/graphql/schema";

export default mergeTypeDefs([
  baseSchema,
  invitationSchema,
  roleSchema,
  userSchema,
]);
