export const getPermissionsSchema = {
  description: "Get all available permissions",
  operationId: "getPermissions",
  response: {
    200: {
      properties: {
        permissions: {
          items: {
            type: "string",
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
  tags: ["permissions"],
};
