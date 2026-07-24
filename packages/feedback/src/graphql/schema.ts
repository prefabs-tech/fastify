import { baseSchema, mergeTypeDefs } from "@prefabs.tech/fastify-graphql";

import feedbackSchema from "../model/feedback/graphql/schema";

export default mergeTypeDefs([baseSchema, feedbackSchema]);
