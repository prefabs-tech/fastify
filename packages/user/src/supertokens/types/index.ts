import type { FastifyInstance } from "fastify";
import type { TypeInput as EmailVerificationRecipeConfig } from "supertokens-node/recipe/emailverification/types";
import type { TypeInput as SessionRecipeConfig } from "supertokens-node/recipe/session/types";
import type { TypeProvider } from "supertokens-node/recipe/thirdpartyemailpassword";
import type { TypeInput as ThirdPartyEmailPasswordRecipeConfig } from "supertokens-node/recipe/thirdpartyemailpassword/types";
import type { TypeInput as UserRolesRecipeConfig } from "supertokens-node/recipe/userroles/types";
import type { RecipeListFunction } from "supertokens-node/types";

import type { EmailVerificationRecipe } from "./emailVerificationRecipe";
import type { SessionRecipe } from "./sessionRecipe";
import type { ThirdPartyEmailPasswordRecipe } from "./thirdPartyEmailPasswordRecipe";

interface AppleProviderConfig {
  clientId: string;
  clientSecret: {
    keyId: string;
    privateKey: string;
    teamId: string;
  };
  isDefault?: boolean;
}

interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
}

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

/**
 * App-facing provider config. Mapped to SuperTokens `ProviderInput` in
 * `thirdPartyProviders.ts` (v16 factories require a nested `config` object).
 */
interface SupertokensThirdPartyProvider {
  apple?: AppleProviderConfig[];
  custom?: TypeProvider[];
  facebook?: OAuthProviderConfig;
  github?: OAuthProviderConfig;
  google?: OAuthProviderConfig;
}

export type { SupertokensConfig, SupertokensRecipeFactory, SupertokensRecipes };
