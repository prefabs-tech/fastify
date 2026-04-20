import type { FastifyInstance } from "fastify";
import type { EmailDeliveryInterface } from "supertokens-node/lib/build/ingredients/emaildelivery/types";
import type {
  APIInterface,
  RecipeInterface,
  TypeEmailVerificationEmailDeliveryInput,
} from "supertokens-node/recipe/emailverification/types";

import EmailVerification from "supertokens-node/recipe/emailverification";

type APIInterfaceWrapper = {
  [key in keyof APIInterface]?: (
    originalImplementation: APIInterface,
    fastify: FastifyInstance,
  ) => APIInterface[key];
};

interface EmailVerificationRecipe {
  mode?: "OPTIONAL" | "REQUIRED";
  override?: {
    apis?: APIInterfaceWrapper;
    functions?: RecipeInterfaceWrapper;
  };
  sendEmail?: SendEmailWrapper;
}

type RecipeInterfaceWrapper = {
  [key in keyof RecipeInterface]?: (
    originalImplementation: RecipeInterface,
    fastify: FastifyInstance,
  ) => RecipeInterface[key];
};

type SendEmailWrapper = (
  originalImplementation: EmailDeliveryInterface<TypeEmailVerificationEmailDeliveryInput>,
  fastify: FastifyInstance,
) => typeof EmailVerification.sendEmail;

export type {
  APIInterfaceWrapper,
  EmailVerificationRecipe,
  RecipeInterfaceWrapper,
  SendEmailWrapper,
};
