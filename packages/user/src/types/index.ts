import type { PaginatedList } from "@prefabs.tech/fastify-slonik";
import type { MercuriusContext } from "mercurius";
import type { QueryResultRow } from "slonik";

interface ChangeEmailInput {
  email: string;
}

interface ChangePasswordInput {
  newPassword?: string;
  oldPassword?: string;
}

interface EmailErrorMessages {
  invalid?: string;
  required?: string;
}

interface PasswordErrorMessages {
  required?: string;
  weak?: string;
}

interface Resolver {
  [key: string]: (
    parent: unknown,
    argyments_: {
      [key: string]: unknown;
    },
    context: MercuriusContext,
  ) => Promise<null | PaginatedList<QueryResultRow> | QueryResultRow>;
}

export type {
  ChangeEmailInput,
  ChangePasswordInput,
  EmailErrorMessages,
  PasswordErrorMessages,
  Resolver,
};

export type { EmailVerificationRecipe } from "../supertokens/types/emailVerificationRecipe.js";
export type { SessionRecipe } from "../supertokens/types/sessionRecipe.js";
export type { ThirdPartyEmailPasswordRecipe } from "../supertokens/types/thirdPartyEmailPasswordRecipe.js";
export * from "./accessControl.js";
export * from "./config.js";
export * from "./invitation.js";

export * from "./isEmailOptions.js";
export * from "./strongPasswordOptions.js";
export * from "./user.js";
