import { gql } from "@prefabs.tech/fastify-graphql";

const invitation = gql`
  type Invitation {
    id: Int!
    acceptedAt: Float
    appId: Int
    email: String!
    expiresAt: Float!
    invitedById: String!
    payload: JSON
    revokedAt: Float
    role: String!
    createdAt: Float!
    updatedAt: Float!
  }

  type Invitations {
    totalCount: Int
    filteredCount: Int
    data: [Invitation]!
  }

  input AcceptInvitationFieldInput {
    email: String!
    password: String!
  }

  input InvitationCreateInput {
    appId: Int
    email: String!
    expiresAt: String
    payload: JSON
    role: String!
  }

  input InvitationUpdateInput {
    acceptedAt: String
    expiresAt: String
    revokedAt: String
  }

  type Mutation {
    acceptInvitation(
      token: String!
      data: AcceptInvitationFieldInput!
    ): AuthResponse
    createInvitation(data: InvitationCreateInput!): Invitation @auth
    deleteInvitation(id: Int!): Invitation @auth
    resendInvitation(id: Int!): Invitation @auth
    revokeInvitation(id: Int!): Invitation @auth
  }

  type Query {
    invitations(
      limit: Int
      offset: Int
      filters: Filters
      sort: [SortInput]
    ): Invitations!
    getInvitationByToken(token: String!): Invitation
  }
`;

export default invitation;
