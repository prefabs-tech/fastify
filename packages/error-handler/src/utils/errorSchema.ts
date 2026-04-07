export const errorSchema = {
  $id: "ErrorResponse",
  additionalProperties: true,
  properties: {
    code: { type: "string" },
    error: { type: "string" },
    message: { type: "string" },
    name: { type: "string" },
    stack: {
      items: {
        additionalProperties: true,
        type: "object",
      },
      type: "array",
    },
    statusCode: { type: "number" },
  },
  type: "object",
};
