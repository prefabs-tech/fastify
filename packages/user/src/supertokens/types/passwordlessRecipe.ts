import { FastifyInstance } from "fastify";

import type {
  APIInterface,
  RecipeInterface,
} from "supertokens-node/recipe/passwordless/types";

type APIInterfaceWrapper = {
  [key in keyof APIInterface]?: (
    originalImplementation: APIInterface,
    fastify: FastifyInstance,
  ) => APIInterface[key];
};

type RecipeInterfaceWrapper = {
  [key in keyof RecipeInterface]?: (
    originalImplementation: RecipeInterface,
    fastify: FastifyInstance,
  ) => RecipeInterface[key];
};

interface PasswordlessRecipe {
  contactMethod?: "EMAIL" | "PHONE" | "EMAIL_OR_PHONE";
  flowType?: "USER_INPUT_CODE";
  override?: {
    apis?: APIInterfaceWrapper;
    functions?: RecipeInterfaceWrapper;
  };
}

export type { APIInterfaceWrapper, RecipeInterfaceWrapper, PasswordlessRecipe };
