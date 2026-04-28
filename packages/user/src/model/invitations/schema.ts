const invitationCreateInputSchema = {
  properties: {
    appId: { nullable: true, type: "integer" },
    email: { format: "email", type: "string" },
    payload: { additionalProperties: true, nullable: true, type: "object" },
    role: { type: "string" },
  },
  required: ["email", "role"],
  type: "object",
};

const userSchema = {
  additionalProperties: true,
  properties: {
    email: { format: "email", type: "string" },
    id: { type: "string" },
  },
  type: "object",
};

const invitationSchema = {
  properties: {
    acceptedAt: { nullable: true, type: "integer" },
    appId: { nullable: true, type: "integer" },
    createdAt: { type: "integer" },
    email: { format: "email", type: "string" },
    expiresAt: { type: "integer" },
    id: { type: "integer" },
    invitedBy: {
      ...userSchema,
      nullable: true,
    },
    invitedById: { type: "string" },
    payload: { additionalProperties: true, nullable: true, type: "object" },
    revokedAt: { nullable: true, type: "integer" },
    role: { type: "string" },
    token: { type: "string" },
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
  type: "object",
};

export const acceptInvitationSchema = {
  body: {
    properties: {
      email: { format: "email", type: "string" },
      password: { format: "password", type: "string" },
    },
    required: ["email", "password"],
    type: "object",
  },
  description: "Accept an invitation using the invitation token",
  operationId: "acceptInvitation",
  params: {
    properties: {
      token: { type: "string" },
    },
    required: ["token"],
    type: "object",
  },
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
  tags: ["invitations"],
};

export const createInvitationSchema = {
  body: invitationCreateInputSchema,
  description: "Create a new invitation",
  operationId: "createInvitation",
  response: {
    200: invitationSchema,
    400: {
      $ref: "ErrorResponse#",
      description: "Bad Request",
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
  tags: ["invitations"],
};

export const deleteInvitationSchema = {
  description: "Delete an invitation by ID",
  operationId: "deleteInvitation",
  params: {
    properties: {
      id: { type: "integer" },
    },
    required: ["id"],
    type: "object",
  },
  response: {
    200: invitationSchema,
    400: {
      $ref: "ErrorResponse#",
      description: "Bad Request",
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
      description: "Invitation not found",
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
    properties: {
      token: { type: "string" },
    },
    required: ["token"],
    type: "object",
  },
  response: {
    200: {
      ...invitationSchema,
      nullable: true,
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
      description: "Invitation not found",
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
      description: "List of paginated list of invitations",
      properties: {
        data: {
          items: invitationSchema,
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
  tags: ["invitations"],
};

export const resendInvitationSchema = {
  description: "Resend an invitation by ID",
  operationId: "resendInvitation",
  params: {
    properties: {
      id: { type: "integer" },
    },
    required: ["id"],
    type: "object",
  },
  response: {
    200: {
      oneOf: [
        invitationSchema,
        {
          properties: {
            message: { type: "string" },
            status: { const: "ERROR", type: "string" },
          },
          type: "object",
        },
      ],
    },
    400: {
      $ref: "ErrorResponse#",
      description: "Bad Request",
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
      description: "Invitation not found",
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
    properties: {
      id: { type: "integer" },
    },
    required: ["id"],
    type: "object",
  },
  response: {
    200: invitationSchema,
    400: {
      $ref: "ErrorResponse#",
      description: "Bad Request",
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
      description: "Invitation not found",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["invitations"],
};

export const updateInvitationSchema = {
  body: {
    properties: {
      email: { format: "email", type: "string" },
      status: { enum: ["accepted", "declined"], type: "string" },
    },
    required: ["email", "status"],
    type: "object",
  },
  description: "Update an invitation",
  operationId: "updateInvitation",
  response: {
    200: {
      description: "Invitation updated successfully",
      properties: {
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
    403: {
      $ref: "ErrorResponse#",
      description: "Forbidden",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["invitations"],
};
