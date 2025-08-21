const errorSchema = {
  type: "object",
  properties: {
    code: { type: "string" },
    error: { type: "string" },
    message: { type: "string" },
    name: { type: "string" },
    stack: {
      type: "array",
      items: { type: "object" },
    },
    statusCode: { type: "number" },
  },
  required: ["message", "name", "statusCode"],
  additionalProperties: true,
};

export const testEmailSchema = {
  response: {
    200: {
      type: "object",
      properties: {
        status: { type: "string", const: "ok" },
        message: { type: "string", const: "Email successfully sent" },
        info: {
          type: "object",
          properties: {
            from: { type: "string" },
            to: { type: "string" },
          },
        },
      },
      required: ["status", "message", "info"],
    },
    500: {
      ...errorSchema,
    },
  },
  tags: ["email"],
  summary: "Test email",
};
