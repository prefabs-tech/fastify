import type { FastifyInstance } from "fastify";
import type { TwilioServiceConfig } from "supertokens-node/lib/build/ingredients/smsdelivery/services/twilio";
import type {
  APIInterface,
  TypeInput as PasswordlessRecipeConfig,
  RecipeInterface,
} from "supertokens-node/recipe/passwordless/types";

type APIInterfaceWrapper = {
  [key in keyof APIInterface]?: (
    originalImplementation: APIInterface,
    fastify: FastifyInstance,
  ) => APIInterface[key];
};

interface PhoneAuthConfig {
  /**
   * Phone numbers that skip Twilio entirely and are verified against
   * `devModeOtp` instead.
   */
  bypassSmsFor?: string[];
  /**
   * @default "PHONE"
   */
  contactMethod?: "EMAIL" | "EMAIL_OR_PHONE" | "PHONE";
  /**
   * Required when `enableDevMode` is true.
   */
  devModeOtp?: string;
  /**
   * @default true
   */
  enabled?: boolean;
  /**
   * Skip Twilio and accept `devModeOtp` for every number.
   * @default false
   */
  enableDevMode?: boolean;
  /**
   * SuperTokens requires an email, so passwordless users get a synthetic
   * `<phoneNumber>@<fallbackEmailDomain>` one. Defaults to the app name.
   */
  fallbackEmailDomain?: string;
  /**
   * @default "USER_INPUT_CODE"
   */
  flowType?: "USER_INPUT_CODE";
  override?: {
    apis?: APIInterfaceWrapper;
    functions?: RecipeInterfaceWrapper;
  };
  /**
   * Full escape hatch: replaces the generated recipe config entirely.
   */
  recipe?: (fastify: FastifyInstance) => PasswordlessRecipeConfig;
  twilio?: TwilioConfig;
}

type RecipeInterfaceWrapper = {
  [key in keyof RecipeInterface]?: (
    originalImplementation: RecipeInterface,
    fastify: FastifyInstance,
  ) => RecipeInterface[key];
};

type TwilioConfig = Omit<
  TwilioServiceConfig,
  "from" | "messagingServiceSid"
> & {
  verifyServiceSid: string;
};

export type {
  APIInterfaceWrapper,
  PhoneAuthConfig,
  RecipeInterfaceWrapper,
  TwilioConfig,
};
