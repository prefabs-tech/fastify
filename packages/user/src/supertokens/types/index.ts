import type { FastifyInstance } from "fastify";
import type { TypeInput as EmailVerificationRecipeConfig } from "supertokens-node/recipe/emailverification/types/index.js";
import type { TypeInput as SessionRecipeConfig } from "supertokens-node/recipe/session/types/index.js";
import type { TypeProvider } from "supertokens-node/recipe/thirdpartyemailpassword/index.js";
import type { TypeInput as ThirdPartyEmailPasswordRecipeConfig } from "supertokens-node/recipe/thirdpartyemailpassword/types/index.js";
import type { TypeInput as UserRolesRecipeConfig } from "supertokens-node/recipe/userroles/types/index.js";
import type { RecipeListFunction } from "supertokens-node/types/index.js";

import {
  Apple,
  Facebook,
  Github,
  Google,
} from "supertokens-node/recipe/thirdpartyemailpassword/index.js";

import type { EmailVerificationRecipe } from "./emailVerificationRecipe.js";
import type { SessionRecipe } from "./sessionRecipe.js";
import type { ThirdPartyEmailPasswordRecipe } from "./thirdPartyEmailPasswordRecipe.js";

interface SupertokensConfig {
  apiBasePath?: string;
  /**
   * @default true
   */
  checkSessionInDatabase?: boolean;
  connectionUri: string;
  emailVerificationPath?: string;
  providers?: SupertokensThirdPartyProvider;
  recipes?: SupertokensRecipes;
  refreshTokenCookiePath?: string;
  resetPasswordPath?: string;
  sendUserAlreadyExistsWarning?: boolean;
  setErrorHandler?: boolean;
}

type SupertokensRecipeFactory = (
  fastify: FastifyInstance,
) => RecipeListFunction;

interface SupertokensRecipes {
  emailVerification?:
    | ((fastify: FastifyInstance) => EmailVerificationRecipeConfig)
    | EmailVerificationRecipe;
  session?: ((fastify: FastifyInstance) => SessionRecipeConfig) | SessionRecipe;
  thirdPartyEmailPassword?:
    | ((fastify: FastifyInstance) => ThirdPartyEmailPasswordRecipeConfig)
    | ThirdPartyEmailPasswordRecipe;
  userRoles?: (fastify: FastifyInstance) => UserRolesRecipeConfig;
}

interface SupertokensThirdPartyProvider {
  apple?: Parameters<typeof Apple>[0][];
  custom?: TypeProvider[];
  facebook?: Parameters<typeof Facebook>[0];
  github?: Parameters<typeof Github>[0];
  google?: Parameters<typeof Google>[0];
}

export type { SupertokensConfig, SupertokensRecipeFactory, SupertokensRecipes };
