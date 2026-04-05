import type { FastifyInstance } from "fastify";
import type { BaseRequest } from "supertokens-node/lib/build/framework";
import type { TypeInput as OpenIdTypeInput } from "supertokens-node/lib/build/recipe/openid/types";
import type {
  APIInterface,
  ErrorHandlers,
  RecipeInterface,
  TokenTransferMethod,
} from "supertokens-node/recipe/session/types";

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

interface SessionRecipe {
  accessTokenPath?: string;
  antiCsrf?: "NONE" | "VIA_CUSTOM_HEADER" | "VIA_TOKEN";
  cookieDomain?: string;
  cookieSameSite?: "lax" | "none" | "strict";
  cookieSecure?: boolean;
  errorHandlers?: ErrorHandlers;
  exposeAccessTokenToFrontendInCookieBasedAuth?: boolean;
  getTokenTransferMethod?: (input: {
    forCreateNewSession: boolean;
    req: BaseRequest;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userContext: any;
  }) => "any" | TokenTransferMethod;
  invalidClaimStatusCode?: number;
  override?: {
    apis?: APIInterfaceWrapper;
    functions?: RecipeInterfaceWrapper;
    openIdFeature?: OpenIdTypeInput["override"];
  };
  sessionExpiredStatusCode?: number;
  useDynamicAccessTokenSigningKey?: boolean;
}

export type { APIInterfaceWrapper, RecipeInterfaceWrapper, SessionRecipe };
