const errorSchema = {
  additionalProperties: true,
  properties: {
    code: { type: "string" },
    error: { type: "string" },
    message: { type: "string" },
    name: { type: "string" },
    stack: {
      items: { type: "object" },
      type: "array",
    },
    statusCode: { type: "number" },
  },
  required: ["message", "name", "statusCode"],
  type: "object",
};

export const testEmailSchema = {
  response: {
    200: {
      properties: {
        info: {
          properties: {
            from: { type: "string" },
            to: { type: "string" },
          },
          type: "object",
        },
        message: { const: "Email successfully sent", type: "string" },
        status: { const: "ok", type: "string" },
      },
      required: ["status", "message", "info"],
      type: "object",
    },
    500: {
      ...errorSchema,
    },
  },
  summary: "Test email",
  tags: ["email"],
};
