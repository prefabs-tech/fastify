import type { FastifyInstance } from "fastify";
import type { EmailDeliveryInterface } from "supertokens-node/lib/build/ingredients/emaildelivery/types";
import type { TypeEmailPasswordPasswordResetEmailDeliveryInput } from "supertokens-node/lib/build/recipe/emailpassword/types";
import type {
  APIInterface,
  RecipeInterface,
  TypeInputSignUp,
} from "supertokens-node/recipe/thirdpartyemailpassword/types";

import ThirdPartyEmailPassword from "supertokens-node/recipe/thirdpartyemailpassword";

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

type SendEmailWrapper = (
  originalImplementation: EmailDeliveryInterface<TypeEmailPasswordPasswordResetEmailDeliveryInput>,
  fastify: FastifyInstance,
) => typeof ThirdPartyEmailPassword.sendEmail;

interface ThirdPartyEmailPasswordRecipe {
  override?: {
    apis?: APIInterfaceWrapper;
    functions?: RecipeInterfaceWrapper;
  };
  sendEmail?: SendEmailWrapper;
  signUpFeature?: TypeInputSignUp;
}

export type {
  APIInterfaceWrapper,
  RecipeInterfaceWrapper,
  SendEmailWrapper,
  ThirdPartyEmailPasswordRecipe,
};
