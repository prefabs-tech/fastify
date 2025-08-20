const userSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    email: { type: "string", format: "email" },
    roles: { type: "array", items: { type: "string" } },
    disabled: { type: "boolean" },
    lastLoginAt: { type: "number" },
    signedUpAt: { type: "number" },
    deletedAt: { type: "number", nullable: true },
    photoId: { type: "number", nullable: true },
  },
  additionalProperties: true,
  required: ["id", "email", "roles", "disabled", "lastLoginAt", "signedUpAt"],
};

export const adminSignUpSchema = {
  description: "Create a new admin user",
  operationId: "adminSignUp",
  body: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", format: "password" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        status: { type: "string" },
        user: userSchema,
      },
    },
    400: {
      description: "Bad Request",
      $ref: "ErrorResponse#",
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
      type: "object",
      properties: {
        signUp: { type: "boolean" },
      },
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["users"],
};

export const changeEmailSchema = {
  description: "Change user's email address",
  operationId: "changeEmail",
  body: {
    type: "object",
    required: ["email"],
    properties: {
      email: { type: "string", format: "email" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        status: { type: "string" },
        message: { type: "string" },
      },
    },
    400: {
      description: "Bad Request",
      $ref: "ErrorResponse#",
    },
    401: {
      description: "Unauthorized",
      $ref: "ErrorResponse#",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["users"],
};

export const changePasswordSchema = {
  description: "Change user's password",
  operationId: "changePassword",
  body: {
    type: "object",
    required: ["oldPassword", "newPassword"],
    properties: {
      oldPassword: { type: "string", format: "password" },
      newPassword: { type: "string", format: "password" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        statusCode: { type: "number" },
        status: { type: "string" },
        message: { type: "string" },
      },
    },
    400: {
      description: "Bad Request",
      $ref: "ErrorResponse#",
    },
    401: {
      description: "Unauthorized",
      $ref: "ErrorResponse#",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["users"],
};

export const deleteMeSchema = {
  description: "Delete the current user's account",
  operationId: "deleteMe",
  body: {
    type: "object",
    required: ["password"],
    properties: {
      password: { type: "string", format: "password" },
    },
  },
  response: {
    200: {
      description: "User deleted successfully",
      type: "object",
      properties: {
        status: { type: "string" },
      },
    },
    401: {
      description: "Unauthorized",
      $ref: "ErrorResponse#",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["users"],
};

export const uploadPhotoSchema = {
  description: "Upload a photo for the current user",
  consumes: ["multipart/form-data"],
  body: {
    type: "object",
    properties: {
      photo: { isFile: true },
    },
  },
  response: {
    200: userSchema,
    401: {
      description: "Unauthorized",
      $ref: "ErrorResponse#",
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
      description: "Unauthorized",
      $ref: "ErrorResponse#",
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
      $ref: "ErrorResponse#",
    },
    403: {
      description: "Forbidden",
      $ref: "ErrorResponse#",
    },
    404: {
      description: "User not found",
      $ref: "ErrorResponse#",
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
      $ref: "ErrorResponse#",
    },
    403: {
      description: "Forbidden",
      $ref: "ErrorResponse#",
    },
    404: {
      description: "User not found",
      $ref: "ErrorResponse#",
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
      description: "Unauthorized",
      $ref: "ErrorResponse#",
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
      $ref: "ErrorResponse#",
    },
    403: {
      description: "Forbidden",
      $ref: "ErrorResponse#",
    },
    404: {
      description: "User not found",
      $ref: "ErrorResponse#",
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
      $ref: "ErrorResponse#",
    },
    403: {
      description: "Forbidden",
      $ref: "ErrorResponse#",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["users"],
};

export const updateMeSchema = {
  description: "Update current user's profile",
  operationId: "updateMe",
  body: {
    type: "object",
    additionalProperties: true,
  },
  response: {
    200: userSchema,
    401: {
      description: "Unauthorized",
      $ref: "ErrorResponse#",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["users"],
};
