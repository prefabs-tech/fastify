import { gql } from "@prefabs.tech/fastify-graphql";

const user = gql`
  scalar Upload

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

const errorSchema = {
  type: "object",
  properties: {
    code: { type: "string" },
    error: { type: "object" },
    message: { type: "string" },
    statusCode: { type: "number" },
    status: { type: "string" },
  },
};

const userSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    email: { type: "string", format: "email" },
    firstName: { type: "string" },
    lastName: { type: "string" },
    role: { type: "string" },
    status: { type: "string" },
    createdAt: { type: "number" },
    updatedAt: { type: "number" },
  },
  required: ["id", "email", "role", "status", "createdAt", "updatedAt"],
};

export const createUserSchema = {
  description: "Create a new user",
  operationId: "createUser",
  body: {
    type: "object",
    required: ["email", "password", "role"],
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", format: "password" },
      firstName: { type: "string" },
      lastName: { type: "string" },
      role: { type: "string" },
    },
  },
  response: {
    201: userSchema,
    400: {
      description: "Bad Request",
      ...errorSchema,
    },
    401: {
      description: "Unauthorized",
      ...errorSchema,
    },
    403: {
      description: "Forbidden",
      ...errorSchema,
    },
    500: {
      ...errorSchema,
    },
  },
  tags: ["users"],
};

export const deleteUserSchema = {
  description: "Delete a user by ID",
  operationId: "deleteUser",
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        status: { type: "string" },
      },
    },
    401: {
      description: "Unauthorized",
      ...errorSchema,
    },
    403: {
      description: "Forbidden",
      ...errorSchema,
    },
    404: {
      description: "User not found",
      ...errorSchema,
    },
    500: {
      ...errorSchema,
    },
  },
  tags: ["users"],
};

export const getUserSchema = {
  description: "Get a user by ID",
  operationId: "getUser",
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" },
    },
  },
  response: {
    200: userSchema,
    401: {
      description: "Unauthorized",
      ...errorSchema,
    },
    403: {
      description: "Forbidden",
      ...errorSchema,
    },
    404: {
      description: "User not found",
      ...errorSchema,
    },
    500: {
      ...errorSchema,
    },
  },
  tags: ["users"],
};

export const getUsersSchema = {
  description:
    "Get a paginated list of users with optional filtering and sorting",
  operationId: "getUsers",
  querystring: {
    type: "object",
    properties: {
      limit: { type: "number" },
      offset: { type: "number" },
      filters: { type: "string" },
      sort: { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      required: ["totalCount", "filteredCount", "data"],
      properties: {
        totalCount: { type: "integer" },
        filteredCount: { type: "integer" },
        data: {
          type: "array",
          items: userSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      ...errorSchema,
    },
    403: {
      description: "Forbidden",
      ...errorSchema,
    },
    500: {
      ...errorSchema,
    },
  },
  tags: ["users"],
};

export const updateUserSchema = {
  description: "Update a user's information",
  operationId: "updateUser",
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" },
    },
  },
  body: {
    type: "object",
    properties: {
      firstName: { type: "string" },
      lastName: { type: "string" },
      role: { type: "string" },
      status: { type: "string" },
    },
  },
  response: {
    200: userSchema,
    400: {
      description: "Bad Request",
      ...errorSchema,
    },
    401: {
      description: "Unauthorized",
      ...errorSchema,
    },
    403: {
      description: "Forbidden",
      ...errorSchema,
    },
    404: {
      description: "User not found",
      ...errorSchema,
    },
    500: {
      ...errorSchema,
    },
  },
  tags: ["users"],
};

export default user;
