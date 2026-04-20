export const createRoleSchema = {
  body: {
    properties: {
      permissions: {
        items: { type: "string" },
        type: "array",
      },
      role: { type: "string" },
    },
    required: ["role"],
    type: "object",
  },
  description: "Create a new role with optional permissions",
  operationId: "createRole",
  response: {
    201: {
      description: "Role created successfully",
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
  tags: ["roles"],
};

export const deleteRoleSchema = {
  description: "Delete a role by name",
  operationId: "deleteRole",
  querystring: {
    properties: {
      role: { type: "string" },
    },
    type: "object",
  },
  response: {
    200: {
      description: "Role deleted successfully",
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
    422: {
      $ref: "ErrorResponse#",
      description: "Unprocessable Entity",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["roles"],
};

export const getRolePermissionsSchema = {
  description: "Get permissions for a specific role",
  operationId: "getRolePermissions",
  querystring: {
    properties: {
      role: { type: "string" },
    },
    type: "object",
  },
  response: {
    200: {
      description: "Role permissions retrieved successfully",
      properties: {
        permissions: {
          items: { type: "string" },
          type: "array",
        },
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
      description: "Role not found",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["roles"],
};

export const getRolesSchema = {
  description: "Get all available roles with their permissions",
  operationId: "getRoles",
  response: {
    200: {
      properties: {
        roles: {
          items: {
            properties: {
              permissions: {
                items: { type: "string" },
                type: "array",
              },
              role: { type: "string" },
            },
            type: "object",
          },
          type: "array",
        },
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
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["roles"],
};

export const updateRoleSchema = {
  body: {
    properties: {
      permissions: {
        items: { type: "string" },
        type: "array",
      },
      role: { type: "string" },
    },
    required: ["role"],
    type: "object",
  },
  description: "Update a role's permissions",
  operationId: "updateRole",
  response: {
    200: {
      description: "Role updated successfully",
      properties: {
        permissions: {
          items: { type: "string" },
          type: "array",
        },
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
  tags: ["roles"],
};
