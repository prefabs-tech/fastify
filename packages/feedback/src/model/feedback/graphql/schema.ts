import { gql } from "@prefabs.tech/fastify-graphql";

const feedbackSchema = gql`
  type Feedback {
    id: Int!
    typeId: Int!
    message: String!
    userId: String
    appVersion: String
    deviceModel: String
    platform: String
    createdAt: Float!
    updatedAt: Float!
  }

  input FeedbackCreateInput {
    typeId: Int!
    message: String!
    appVersion: String
    deviceModel: String
    platform: String
  }

  type Mutation {
    createFeedback(data: FeedbackCreateInput): Feedback @auth
  }
`;

export default feedbackSchema;
