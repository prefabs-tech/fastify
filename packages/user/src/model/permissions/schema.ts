export const getPermissionsSchema = {
  description: "Get all available permissions",
  operationId: "getPermissions",
  response: {
    200: {
      type: "object",
      properties: {
        permissions: {
          type: "array",
          items: {
            type: "string",
          },
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
  tags: ["permissions"],
};
