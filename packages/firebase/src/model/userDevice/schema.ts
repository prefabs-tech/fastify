const userDeviceSchema = {
  properties: {
    createdAt: { type: "number" },
    deviceToken: { type: "string" },
    updatedAt: { type: "number" },
    userId: { type: "string" },
  },
  required: ["userId", "deviceToken", "createdAt", "updatedAt"],
  type: "object",
};

export const deleteUserDeviceSchema = {
  body: {
    properties: {
      deviceToken: { type: "string" },
    },
    required: ["deviceToken"],
    type: "object",
  },
  description: "Delete a user device by device token",
  operationId: "deleteUserDevice",
  response: {
    200: {
      ...userDeviceSchema,
      nullable: true,
    },
    401: {
      $ref: "ErrorResponse#",
      description: "Unauthorized",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["user-devices"],
};

export const postUserDeviceSchema = {
  body: {
    properties: {
      deviceToken: { type: "string" },
    },
    required: ["deviceToken"],
    type: "object",
  },
  description: "Register a new user device",
  operationId: "postUserDevice",
  response: {
    200: {
      ...userDeviceSchema,
      nullable: true,
    },
    401: {
      $ref: "ErrorResponse#",
      description: "Unauthorized",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["user-devices"],
};
