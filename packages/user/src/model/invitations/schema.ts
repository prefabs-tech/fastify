const invitationCreateInputSchema = {
  type: "object",
  properties: {
    appId: { type: "integer", nullable: true },
    email: { type: "string", format: "email" },
    payload: { type: "object", additionalProperties: true, nullable: true },
    role: { type: "string" },
  },
  required: ["email", "role"],
};

const userSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    email: { type: "string", format: "email" },
  },
  additionalProperties: true,
};

const invitationSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    acceptedAt: { type: "integer", nullable: true },
    appId: { type: "integer", nullable: true },
    email: { type: "string", format: "email" },
    expiresAt: { type: "integer" },
    invitedBy: {
      ...userSchema,
      nullable: true,
    },
    invitedById: { type: "string" },
    payload: { type: "object", additionalProperties: true, nullable: true },
    revokedAt: { type: "integer", nullable: true },
    role: { type: "string" },
    token: { type: "string" },
    createdAt: { type: "integer" },
    updatedAt: { type: "integer" },
  },
  required: [
    "id",
    "email",
    "expiresAt",
    "invitedById",
    "role",
    "createdAt",
    "updatedAt",
  ],
};

export const acceptInvitationSchema = {
  description: "Accept an invitation using the invitation token",
  operationId: "acceptInvitation",
  body: {
    type: "object",
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", format: "password" },
    },
    required: ["email", "password"],
  },
  params: {
    type: "object",
    properties: {
      token: { type: "string" },
    },
    required: ["token"],
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
  tags: ["invitations"],
};

export const createInvitationSchema = {
  description: "Create a new invitation",
  operationId: "createInvitation",
  body: invitationCreateInputSchema,
  response: {
    200: invitationSchema,
    400: {
      description: "Bad Request",
      $ref: "ErrorResponse#",
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
  tags: ["invitations"],
};

export const deleteInvitationSchema = {
  description: "Delete an invitation by ID",
  operationId: "deleteInvitation",
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "integer" },
    },
  },
  response: {
    200: invitationSchema,
    400: {
      description: "Bad Request",
      $ref: "ErrorResponse#",
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
      description: "Invitation not found",
      $ref: "ErrorResponse#",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["invitations"],
};

export const getInvitationByTokenSchema = {
  description: "Get invitation details by token",
  operationId: "getInvitationByToken",
  params: {
    type: "object",
    required: ["token"],
    properties: {
      token: { type: "string" },
    },
  },
  response: {
    200: {
      ...invitationSchema,
      nullable: true,
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
      description: "Invitation not found",
      $ref: "ErrorResponse#",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["invitations"],
};

export const getInvitationsListSchema = {
  description: "Get a paginated list of invitations",
  operationId: "getInvitationsList",
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
      description: "List of paginated list of invitations",
      type: "object",
      required: ["totalCount", "filteredCount", "data"],
      properties: {
        totalCount: { type: "integer" },
        filteredCount: { type: "integer" },
        data: {
          type: "array",
          items: invitationSchema,
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
  tags: ["invitations"],
};

export const resendInvitationSchema = {
  description: "Resend an invitation by ID",
  operationId: "resendInvitation",
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "integer" },
    },
  },
  response: {
    200: {
      oneOf: [
        invitationSchema,
        {
          type: "object",
          properties: {
            status: { type: "string", const: "ERROR" },
            message: { type: "string" },
          },
        },
      ],
    },
    400: {
      description: "Bad Request",
      $ref: "ErrorResponse#",
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
      description: "Invitation not found",
      $ref: "ErrorResponse#",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["invitations"],
};

export const revokeInvitationSchema = {
  description: "Revoke an invitation by ID",
  operationId: "revokeInvitation",
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "integer" },
    },
  },
  response: {
    200: invitationSchema,
    400: {
      description: "Bad Request",
      $ref: "ErrorResponse#",
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
      description: "Invitation not found",
      $ref: "ErrorResponse#",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["invitations"],
};

export const updateInvitationSchema = {
  description: "Update an invitation",
  operationId: "updateInvitation",
  body: {
    type: "object",
    required: ["email", "status"],
    properties: {
      email: { type: "string", format: "email" },
      status: { type: "string", enum: ["accepted", "declined"] },
    },
  },
  response: {
    200: {
      description: "Invitation updated successfully",
      type: "object",
      properties: {
        status: { type: "string" },
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
    403: {
      description: "Forbidden",
      $ref: "ErrorResponse#",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["invitations"],
};
