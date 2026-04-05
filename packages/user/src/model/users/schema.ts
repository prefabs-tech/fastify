const userSchema = {
  additionalProperties: true,
  properties: {
    deletedAt: { nullable: true, type: "number" },
    disabled: { type: "boolean" },
    email: { format: "email", type: "string" },
    id: { type: "string" },
    lastLoginAt: { type: "number" },
    photoId: { nullable: true, type: "number" },
    roles: { items: { type: "string" }, type: "array" },
    signedUpAt: { type: "number" },
  },
  required: ["id", "email", "roles", "disabled", "lastLoginAt", "signedUpAt"],
  type: "object",
};

export const adminSignUpSchema = {
  body: {
    properties: {
      email: { format: "email", type: "string" },
      password: { format: "password", type: "string" },
    },
    required: ["email", "password"],
    type: "object",
  },
  description: "Create a new admin user",
  operationId: "adminSignUp",
  response: {
    200: {
      properties: {
        status: { type: "string" },
        user: userSchema,
      },
      type: "object",
    },
    400: {
      $ref: "ErrorResponse#",
      description: "Bad Request",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["users"],
};

export const canAdminSignUpSchema = {
  description: "Check if admin signup is allowed",
  operationId: "canAdminSignUp",
  response: {
    200: {
      properties: {
        signUp: { type: "boolean" },
      },
      type: "object",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["users"],
};

export const changeEmailSchema = {
  body: {
    properties: {
      email: { format: "email", type: "string" },
    },
    required: ["email"],
    type: "object",
  },
  description: "Change user's email address",
  operationId: "changeEmail",
  response: {
    200: {
      properties: {
        message: { type: "string" },
        status: { type: "string" },
      },
      type: "object",
    },
    400: {
      $ref: "ErrorResponse#",
      description: "Bad Request",
    },
    401: {
      $ref: "ErrorResponse#",
      description: "Unauthorized",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["users"],
};

export const changePasswordSchema = {
  body: {
    properties: {
      newPassword: { format: "password", type: "string" },
      oldPassword: { format: "password", type: "string" },
    },
    required: ["oldPassword", "newPassword"],
    type: "object",
  },
  description: "Change user's password",
  operationId: "changePassword",
  response: {
    200: {
      properties: {
        message: { type: "string" },
        status: { type: "string" },
        statusCode: { type: "number" },
      },
      type: "object",
    },
    400: {
      $ref: "ErrorResponse#",
      description: "Bad Request",
    },
    401: {
      $ref: "ErrorResponse#",
      description: "Unauthorized",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["users"],
};

export const deleteMeSchema = {
  body: {
    properties: {
      password: { format: "password", type: "string" },
    },
    required: ["password"],
    type: "object",
  },
  description: "Delete the current user's account",
  operationId: "deleteMe",
  response: {
    200: {
      description: "User deleted successfully",
      properties: {
        status: { type: "string" },
      },
      type: "object",
    },
    401: {
      $ref: "ErrorResponse#",
      description: "Unauthorized",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["users"],
};

export const uploadPhotoSchema = {
  body: {
    properties: {
      photo: { isFile: true },
    },
    type: "object",
  },
  consumes: ["multipart/form-data"],
  description: "Upload a photo for the current user",
  response: {
    200: userSchema,
    401: {
      $ref: "ErrorResponse#",
      description: "Unauthorized",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["users"],
};

export const removePhotoSchema = {
  description: "Remove the current user's photo",
  operationId: "removePhoto",
  response: {
    200: userSchema,
    401: {
      $ref: "ErrorResponse#",
      description: "Unauthorized",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["users"],
};

export const disableUserSchema = {
  description: "Disable a user account",
  operationId: "disableUser",
  params: {
    properties: {
      id: { type: "string" },
    },
    required: ["id"],
    type: "object",
  },
  response: {
    200: {
      properties: {
        status: { type: "string" },
      },
      type: "object",
    },
    401: {
      $ref: "ErrorResponse#",
      description: "Unauthorized",
    },
    403: {
      $ref: "ErrorResponse#",
      description: "Forbidden",
    },
    404: {
      $ref: "ErrorResponse#",
      description: "User not found",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["users"],
};

export const enableUserSchema = {
  description: "Enable a user account",
  operationId: "enableUser",
  params: {
    properties: {
      id: { type: "string" },
    },
    required: ["id"],
    type: "object",
  },
  response: {
    200: {
      properties: {
        status: { type: "string" },
      },
      type: "object",
    },
    401: {
      $ref: "ErrorResponse#",
      description: "Unauthorized",
    },
    403: {
      $ref: "ErrorResponse#",
      description: "Forbidden",
    },
    404: {
      $ref: "ErrorResponse#",
      description: "User not found",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["users"],
};

export const getMeSchema = {
  description: "Get current user's profile",
  operationId: "getMe",
  response: {
    200: userSchema,
    401: {
      $ref: "ErrorResponse#",
      description: "Unauthorized",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["users"],
};

export const getUserSchema = {
  description: "Get a user by ID",
  operationId: "getUser",
  params: {
    properties: {
      id: { type: "string" },
    },
    required: ["id"],
    type: "object",
  },
  response: {
    200: userSchema,
    401: {
      $ref: "ErrorResponse#",
      description: "Unauthorized",
    },
    403: {
      $ref: "ErrorResponse#",
      description: "Forbidden",
    },
    404: {
      $ref: "ErrorResponse#",
      description: "User not found",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["users"],
};

export const getUsersSchema = {
  description:
    "Get a paginated list of users with optional filtering and sorting",
  operationId: "getUsers",
  querystring: {
    properties: {
      filters: { type: "string" },
      limit: { type: "number" },
      offset: { type: "number" },
      sort: { type: "string" },
    },
    type: "object",
  },
  response: {
    200: {
      properties: {
        data: {
          items: userSchema,
          type: "array",
        },
        filteredCount: { type: "integer" },
        totalCount: { type: "integer" },
      },
      required: ["totalCount", "filteredCount", "data"],
      type: "object",
    },
    401: {
      $ref: "ErrorResponse#",
      description: "Unauthorized",
    },
    403: {
      $ref: "ErrorResponse#",
      description: "Forbidden",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["users"],
};

export const updateMeSchema = {
  body: {
    additionalProperties: true,
    type: "object",
  },
  description: "Update current user's profile",
  operationId: "updateMe",
  response: {
    200: userSchema,
    401: {
      $ref: "ErrorResponse#",
      description: "Unauthorized",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["users"],
};
