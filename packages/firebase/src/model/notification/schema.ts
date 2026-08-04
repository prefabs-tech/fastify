export const sendNotificationSchema = {
  body: {
    properties: {
      body: { type: "string" },
      title: { type: "string" },
      userId: { type: "string" },
    },
    required: ["title", "body", "userId"],
    type: "object",
  },
  description: "Send a notification to a specific user",
  operationId: "sendNotification",
  response: {
    200: {
      properties: {
        message: { type: "string" },
        success: { type: "boolean" },
      },
      type: "object",
    },
    401: {
      $ref: "ErrorResponse#",
      description: "Unauthorized",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["notifications"],
};
