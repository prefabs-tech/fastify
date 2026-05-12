import type {
  APIInterface,
  RecipeInterface,
} from "supertokens-node/recipe/passwordless/types";

import { FastifyInstance } from "fastify";

type APIInterfaceWrapper = {
  [key in keyof APIInterface]?: (
    originalImplementation: APIInterface,
    fastify: FastifyInstance,
  ) => APIInterface[key];
};

interface PasswordlessRecipe {
  contactMethod?: "EMAIL" | "EMAIL_OR_PHONE" | "PHONE";
  flowType?: "USER_INPUT_CODE";
  override?: {
    apis?: APIInterfaceWrapper;
    functions?: RecipeInterfaceWrapper;
  };
}

type RecipeInterfaceWrapper = {
  [key in keyof RecipeInterface]?: (
    originalImplementation: RecipeInterface,
    fastify: FastifyInstance,
  ) => RecipeInterface[key];
};

export type { APIInterfaceWrapper, PasswordlessRecipe, RecipeInterfaceWrapper };
