import { userSchema } from "../users/schema";

const profileFieldI18nSchema = {
  properties: {
    createdAt: { type: "integer" },
    description: { nullable: true, type: "string" },
    id: { type: "integer" },
    label: { type: "string" },
    locale: { type: "string" },
    updatedAt: { type: "integer" },
  },
  required: ["id", "locale", "label", "createdAt", "updatedAt"],
  type: "object",
};

const profileFieldSchema = {
  properties: {
    createdAt: { type: "integer" },
    default: { nullable: true, type: ["boolean", "number", "string"] },
    i18n: {
      items: profileFieldI18nSchema,
      type: "array",
    },
    id: { type: "integer" },
    name: { type: "string" },
    options: {
      items: {
        additionalProperties: true,
        type: "object",
      },
      type: "array",
    },
    required: { type: "boolean" },
    sortOrder: { type: "integer" },
    type: { type: "integer" },
    updatedAt: { type: "integer" },
  },
  required: [
    "id",
    "name",
    "required",
    "type",
    "createdAt",
    "updatedAt",
    "i18n",
    "options",
  ],
  type: "object",
};

export const getProfileFieldsListSchema = {
  description: "Get profile fields list",
  operationId: "getProfileFieldsList",
  querystring: {
    properties: {
      filters: { type: "string" },
      limit: { type: "number" },
      offset: { type: "number" },
      sort: { type: "string" },
    },
    type: "object",
  },
  response: {
    200: {
      properties: {
        fields: {
          items: profileFieldSchema,
          type: "array",
        },
      },
      required: ["fields"],
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
  tags: ["profileFields"],
};

export const updateUserProfileSchema = {
  body: {
    additionalProperties: true,
    type: "object",
  },
  description: "Update current user's profile fields",
  operationId: "updateUserProfile",
  response: {
    200: userSchema,
    400: {
      $ref: "ErrorResponse#",
      description: "Bad Request",
    },
    401: {
      $ref: "ErrorResponse#",
      description: "Unauthorized",
    },
    500: {
      $ref: "ErrorResponse#",
    },
  },
  tags: ["profileFields"],
};
