import { gql } from "@prefabs.tech/fastify-graphql";

const user = gql`
  type User {
    id: String!
    deletedAt: Float
    disabled: Boolean!
    email: String!
    lastLoginAt: Float!
    photoId: Int
    photo: Photo
    roles: [String]
    signedUpAt: Float!
    timeJoined: Float
  }

  type Photo {
    id: Int!
    url: String!
  }

  type Users {
    totalCount: Int
    filteredCount: Int
    data: [User]!
  }

  type ChangePasswordResponse {
    statusCode: Int
    status: String
    message: String
  }

  type AuthResponse {
    status: String!
    user: User!
  }

  type CanAdminSignUpResponse {
    signUp: Boolean!
  }

  type UpdateUserResponse {
    status: String!
  }

  type deleteUserResponse {
    status: String!
  }

  input UserUpdateInput {
    id: String
  }

  input SingUpFieldInput {
    email: String!
    password: String!
  }

  type ChangeEmailResponse {
    status: String
    message: String
  }

  type Mutation {
    adminSignUp(data: SingUpFieldInput!): AuthResponse
    deleteMe(password: String!): deleteUserResponse @auth
    disableUser(id: String!): UpdateUserResponse @auth
    enableUser(id: String!): UpdateUserResponse @auth
    changePassword(
      oldPassword: String
      newPassword: String
    ): ChangePasswordResponse @auth
    updateMe(data: UserUpdateInput): User
      @auth(profileValidation: false, emailVerification: false)
    changeEmail(email: String!): ChangeEmailResponse
      @auth(profileValidation: false, emailVerification: false)
    uploadPhoto(photo: Upload!): User
      @auth(profileValidation: false, emailVerification: false)
    removePhoto: User @auth(profileValidation: false, emailVerification: false)
  }

  type Query {
    canAdminSignUp: CanAdminSignUpResponse
    user(id: String): User @auth
    users(limit: Int, offset: Int, filters: Filters, sort: [SortInput]): Users!
      @auth
    me: User! @auth(profileValidation: false, emailVerification: false)
  }
`;

export default user;
