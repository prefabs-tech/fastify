export const errorSchema = {
  $id: "ErrorResponse",
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
};
