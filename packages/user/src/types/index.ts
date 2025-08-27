import type { PaginatedList } from "@prefabs.tech/fastify-slonik";
import type { MercuriusContext } from "mercurius";
import type { QueryResultRow } from "slonik";

interface ChangePasswordInput {
  oldPassword?: string;
  newPassword?: string;
}

interface ChangeEmailInput {
  email: string;
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
  ) => Promise<QueryResultRow | null | PaginatedList<QueryResultRow>>;
}

export type {
  ChangeEmailInput,
  ChangePasswordInput,
  EmailErrorMessages,
  PasswordErrorMessages,
  Resolver,
};

export * from "./config";
export * from "./invitation";
export * from "./isEmailOptions";
export * from "./strongPasswordOptions";
export * from "./user";

export type { EmailVerificationRecipe } from "../supertokens/types/emailVerificationRecipe";
export type { SessionRecipe } from "../supertokens/types/sessionRecipe";
export type { ThirdPartyEmailPasswordRecipe } from "../supertokens/types/thirdPartyEmailPasswordRecipe";
