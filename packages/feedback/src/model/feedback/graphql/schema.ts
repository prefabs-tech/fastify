import { gql } from "@prefabs.tech/fastify-graphql";

const feedbackSchema = gql`
  type Feedback {
    appVersion: String
    createdAt: Float!
    deviceModel: String
    id: Int!
    message: String!
    platform: String
    typeId: Int!
    updatedAt: Float!
    userId: String
  }

  input FeedbackCreateInput {
    appVersion: String
    deviceModel: String
    message: String!
    platform: String
    typeId: Int!
  }

  type Mutation {
    createFeedback(data: FeedbackCreateInput): Feedback @auth
  }
`;

export default feedbackSchema;
