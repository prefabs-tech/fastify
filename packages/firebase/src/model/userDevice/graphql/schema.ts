import { gql } from "@prefabs.tech/fastify-graphql";

const userDeviceSchema = gql`
  type UserDevice {
    id: Int!
    userId: String!
    deviceToken: String!
    createdAt: Float!
    updatedAt: Float!
  }

  type UserDevices {
    data: [UserDevice]!
  }

  input UserDeviceCreateInput {
    deviceToken: String!
  }

  input UserDeviceUpdateInput {
    deviceToken: String!
  }

  input UserDeviceRemoveInput {
    deviceToken: String!
  }

  type Mutation {
    addUserDevice(data: UserDeviceCreateInput): UserDevice @auth
    removeUserDevice(data: UserDeviceRemoveInput): UserDevice @auth
  }
`;

export default userDeviceSchema;
