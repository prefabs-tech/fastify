import { gql } from "@prefabs.tech/fastify-graphql";

const notificationSchema = gql`
  type SendNotificationResponse {
    message: String!
  }

  input SendNotificationInput {
    userId: String!
    title: String!
    body: String!
  }

  type Mutation {
    sendNotification(data: SendNotificationInput): SendNotificationResponse
      @auth
  }
`;

export default notificationSchema;
