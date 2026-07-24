const feedbackSchema = {
  properties: {
    appVersion: { type: "string" },
    createdAt: { type: "number" },
    deviceModel: { type: "string" },
    id: { type: "number" },
    message: { type: "string" },
    platform: { type: "string" },
    typeId: { type: "integer" },
    updatedAt: { type: "number" },
    userId: { type: "string" },
  },
  required: ["id", "typeId", "message", "createdAt", "updatedAt"],
  type: "object",
};

export const postFeedbackSchema = {
  body: {
    properties: {
      appVersion: { type: "string" },
      deviceModel: { type: "string" },
      message: { type: "string" },
      platform: { type: "string" },
      typeId: { type: "integer" },
    },
    required: ["typeId", "message"],
    type: "object",
  },
  description: "Create a new feedback entry",
  operationId: "createFeedback",
  response: {
    200: feedbackSchema,
    401: {
      $ref: "ErrorResponse#",
      description: "Unauthorized",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["feedback"],
};
