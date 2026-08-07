import type { FastifyInstance, FastifyRequest } from "fastify";

import { CustomError } from "@prefabs.tech/fastify-error-handler";
import {
  getUser,
  listUsersByAccountInfo,
  RecipeUserId,
} from "supertokens-node";
import { wrapResponse } from "supertokens-node/framework/fastify";
import EmailVerification, {
  EmailVerificationClaim,
} from "supertokens-node/recipe/emailverification";
import Session, { Error as STError } from "supertokens-node/recipe/session";
import ThirdPartyEmailPassword from "supertokens-node/recipe/thirdpartyemailpassword";
import UserRoles from "supertokens-node/recipe/userroles";

import type {
  AuthErrorsProvider,
  AuthProvider,
  AuthResult,
  AuthSession,
  AuthUser,
  AuthUserContext,
  ClaimsProvider,
  EmailPasswordProvider,
  EmailVerificationProvider,
  ResetPasswordResult,
  RolesProvider,
  SessionProvider,
  UpdateEmailOrPasswordResult,
} from "./adapter";
import type { ClaimValidationError, RefreshableClaim } from "./types";

import { ERROR_CODES, SUPERTOKENS_DEFAULT_TENANT_ID } from "../constants";
import supertokensPlugin from "../supertokens";
import createUserContextImpl from "../supertokens/utils/createUserContext";
import ProfileValidationClaim from "../supertokens/utils/profileValidationClaim";

const claimKeyByType: Record<RefreshableClaim, string> = {
  emailVerification: EmailVerificationClaim.key,
  profileValidation: ProfileValidationClaim.key,
};

function excludeValidatorIds<T extends { id: string }>(
  validators: T[],
  skip: RefreshableClaim[],
): T[] {
  const skipKeys = new Set(skip.map((claim) => claimKeyByType[claim]));
  return validators.filter((validator) => !skipKeys.has(validator.id));
}

const supertokensClaimsAdapter: ClaimsProvider = {
  async assertProfileValid(session, request, userContext) {
    const profileValidationClaim = new ProfileValidationClaim();
    const context = createUserContextImpl(userContext, request);

    try {
      await (
        session as unknown as {
          assertClaims?: (...arguments_: unknown[]) => Promise<void>;
        }
      ).assertClaims?.(
        [profileValidationClaim.validators.isVerified()],
        context,
      );

      return;
    } catch (error) {
      if (error instanceof STError && error.type === "INVALID_CLAIMS") {
        return (error.payload ?? []) as unknown as ClaimValidationError[];
      }

      throw error;
    }
  },

  keys: {
    emailVerification: EmailVerificationClaim.key,
    profileValidation: ProfileValidationClaim.key,
  },

  async refreshSessionClaims(session, request, claims, userContext) {
    const context = createUserContextImpl(userContext, request);

    for (const claim of claims) {
      const stSession = session as unknown as {
        fetchAndSetClaim?: (...arguments_: unknown[]) => Promise<void>;
      };

      if (claim === "emailVerification") {
        await stSession.fetchAndSetClaim?.(EmailVerificationClaim, context);
      } else if (claim === "profileValidation") {
        await stSession.fetchAndSetClaim?.(
          new ProfileValidationClaim(),
          context,
        );
      }
    }
  },
};

const supertokensErrorsAdapter: AuthErrorsProvider = {
  createInvalidClaimsError(errors) {
    return new STError({
      message: "invalid claim",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload: errors as any,
      type: "INVALID_CLAIMS",
    });
  },

  createUnauthorizedError(message = "unauthorised") {
    return new STError({
      message,
      type: "UNAUTHORISED",
    });
  },

  isAuthError(error: unknown) {
    return STError.isErrorFromSuperTokens(error);
  },
};

const createUserContext = (
  request: FastifyRequest,
  existing?: AuthUserContext,
): AuthUserContext => createUserContextImpl(existing, request);

interface SupertokensUserLike {
  emails: string[];
  id: string;
  thirdParty?: Array<{ id: string; userId: string }>;
  timeJoined: number;
}

const mapSupertokensUser = (user: SupertokensUserLike): AuthUser => ({
  email: user.emails[0] ?? "",
  id: user.id,
  ...(user.thirdParty?.[0] && { thirdParty: user.thirdParty[0] }),
  timeJoined: user.timeJoined,
});

const supertokensEmailPasswordAdapter: EmailPasswordProvider = {
  async createResetPasswordToken(
    userId: string,
    email: string,
  ): Promise<string> {
    const response = await ThirdPartyEmailPassword.createResetPasswordToken(
      SUPERTOKENS_DEFAULT_TENANT_ID,
      userId,
      email,
    );

    if (response.status === "OK") {
      return response.token;
    }

    throw new CustomError(
      `Failed to create reset password token: ${response.status}`,
      ERROR_CODES.RESET_PASSWORD_TOKEN_FAILED,
    );
  },

  async emailPasswordSignIn(
    email: string,
    password: string,
    userContext?: AuthUserContext,
  ): Promise<AuthResult> {
    const response = await ThirdPartyEmailPassword.emailPasswordSignIn(
      SUPERTOKENS_DEFAULT_TENANT_ID,
      email,
      password,
      userContext,
    );

    if (response.status === "OK" && response.user) {
      return {
        success: true,
        user: mapSupertokensUser(response.user),
      };
    }

    return {
      error: response.status,
      success: false,
    };
  },

  async emailPasswordSignUp(
    email: string,
    password: string,
    userContext?: AuthUserContext,
  ): Promise<AuthResult> {
    const response = await ThirdPartyEmailPassword.emailPasswordSignUp(
      SUPERTOKENS_DEFAULT_TENANT_ID,
      email,
      password,
      userContext,
    );

    if (response.status === "OK") {
      return {
        success: true,
        user: mapSupertokensUser(response.user),
      };
    }

    return {
      error: response.status,
      success: false,
    };
  },

  async getUserById(userId: string): Promise<AuthUser | undefined> {
    const user = await getUser(userId);

    if (!user) return undefined;

    return mapSupertokensUser(user);
  },

  async getUsersByEmail(email: string): Promise<AuthUser[]> {
    const users = await listUsersByAccountInfo(SUPERTOKENS_DEFAULT_TENANT_ID, {
      email,
    });

    return users.map((user) => mapSupertokensUser(user));
  },

  async resetPasswordUsingToken(
    token: string,
    newPassword: string,
  ): Promise<ResetPasswordResult> {
    const response = await ThirdPartyEmailPassword.resetPasswordUsingToken(
      SUPERTOKENS_DEFAULT_TENANT_ID,
      token,
      newPassword,
    );

    if (response.status === "OK") {
      return { success: true };
    }

    return { error: response.status, success: false };
  },

  async updateEmailOrPassword(input: {
    email?: string;
    password?: string;
    userId: string;
  }): Promise<UpdateEmailOrPasswordResult> {
    const response = await ThirdPartyEmailPassword.updateEmailOrPassword({
      email: input.email,
      password: input.password,
      recipeUserId: new RecipeUserId(input.userId),
    });

    if (response.status === "OK") {
      return { success: true };
    }

    return { error: response.status, success: false };
  },
};

const supertokensEmailVerificationAdapter: EmailVerificationProvider = {
  async createEmailVerificationToken(
    userId: string,
    email?: string,
    userContext?: AuthUserContext,
  ): Promise<string> {
    const response = await EmailVerification.createEmailVerificationToken(
      SUPERTOKENS_DEFAULT_TENANT_ID,
      new RecipeUserId(userId),
      email,
      userContext,
    );

    if (response.status === "OK") {
      return response.token;
    }

    throw new CustomError(
      `Failed to create email verification token: ${response.status}`,
      ERROR_CODES.EMAIL_VERIFICATION_TOKEN_FAILED,
    );
  },

  async isEmailVerified(userId: string, email?: string): Promise<boolean> {
    return EmailVerification.isEmailVerified(new RecipeUserId(userId), email);
  },

  async sendVerificationEmail(input) {
    await EmailVerification.sendEmail({
      emailVerifyLink: `${input.appOrigin}/auth/verify-email?token=${input.token}&rid=emailverification`,
      tenantId: SUPERTOKENS_DEFAULT_TENANT_ID,
      type: "EMAIL_VERIFICATION",
      user: {
        email: input.email,
        id: input.userId,
        recipeUserId: new RecipeUserId(input.userId),
      },
      userContext: input.userContext,
    });

    return { status: "OK", success: true };
  },

  async unverifyEmail(userId: string, email?: string): Promise<void> {
    await EmailVerification.unverifyEmail(new RecipeUserId(userId), email);
  },

  async verifyEmailUsingToken(
    token: string,
    userContext?: AuthUserContext,
  ): Promise<boolean> {
    const response = await EmailVerification.verifyEmailUsingToken(
      SUPERTOKENS_DEFAULT_TENANT_ID,
      token,
      undefined,
      userContext,
    );

    return response.status === "OK";
  },
};

const supertokensRolesAdapter: RolesProvider = {
  async addRoleToUser(userId: string, role: string): Promise<void> {
    const response = await UserRoles.addRoleToUser(
      SUPERTOKENS_DEFAULT_TENANT_ID,
      userId,
      role,
    );

    if (response.status !== "OK") {
      throw new CustomError(
        `Failed to add role to user: ${response.status}`,
        ERROR_CODES.ADD_ROLE_FAILED,
      );
    }
  },

  async createNewRoleOrAddPermissions(
    role: string,
    permissions: string[],
  ): Promise<boolean> {
    const response = await UserRoles.createNewRoleOrAddPermissions(
      role,
      permissions,
    );

    return response.createdNewRole;
  },

  async deleteRole(role: string): Promise<boolean> {
    const response = await UserRoles.deleteRole(role);

    return response.didRoleExist;
  },

  async getAllRoles(): Promise<string[]> {
    const response = await UserRoles.getAllRoles();

    return response.roles;
  },

  async getPermissionsForRole(role: string): Promise<string[]> {
    const response = await UserRoles.getPermissionsForRole(role);

    if (response.status === "OK") {
      return response.permissions;
    }

    return [];
  },

  async getRolesForUser(userId: string): Promise<string[]> {
    const response = await UserRoles.getRolesForUser(
      SUPERTOKENS_DEFAULT_TENANT_ID,
      userId,
    );

    return response.roles;
  },

  async getUsersThatHaveRole(role: string): Promise<string[]> {
    const response = await UserRoles.getUsersThatHaveRole(
      SUPERTOKENS_DEFAULT_TENANT_ID,
      role,
    );

    if (response.status === "OK") {
      return response.users;
    }

    return [];
  },

  PermissionClaim: UserRoles.PermissionClaim,

  async removePermissionsFromRole(
    role: string,
    permissions: string[],
  ): Promise<void> {
    await UserRoles.removePermissionsFromRole(role, permissions);
  },

  async rolesExist(roles: string[]): Promise<boolean> {
    const allRoles = await supertokensRolesAdapter.getAllRoles();

    return roles.every((role) => allRoles.includes(role));
  },
};

const supertokensSessionAdapter: SessionProvider = {
  async createNewSession(
    request,
    reply,
    userId,
    accessTokenPayload,
    sessionData,
    userContext,
  ): Promise<AuthSession> {
    return Session.createNewSession(
      request,
      reply,
      SUPERTOKENS_DEFAULT_TENANT_ID,
      new RecipeUserId(userId),
      accessTokenPayload,
      sessionData,
      userContext,
    ) as unknown as AuthSession;
  },

  async getSession(request, reply, options): Promise<AuthSession | undefined> {
    return supertokensSessionAdapter.getVerifySession(options)(request, reply);
  },

  getVerifySession(options) {
    const skipClaims = options?.skipClaims;

    return async (request, reply) => {
      const session = await Session.getSession(request, wrapResponse(reply), {
        checkDatabase: options?.checkDatabase,
        overrideGlobalClaimValidators: skipClaims?.length
          ? async (globalValidators) =>
              excludeValidatorIds(globalValidators, skipClaims)
          : undefined,
        sessionRequired: options?.sessionRequired,
      });

      // Attach the session to the request so handlers can access it
      request.session = session;

      return session as unknown as AuthSession | undefined;
    };
  },

  async revokeAllSessionsForUser(userId: string): Promise<void> {
    await Session.revokeAllSessionsForUser(userId);
  },
};

export const supertokensProvider: AuthProvider = {
  adapter: {
    claims: supertokensClaimsAdapter,
    createUserContext,
    emailPassword: supertokensEmailPasswordAdapter,
    emailVerification: supertokensEmailVerificationAdapter,
    errors: supertokensErrorsAdapter,
    roles: supertokensRolesAdapter,
    session: supertokensSessionAdapter,
  },
  init: async (fastify: FastifyInstance) => {
    await fastify.register(supertokensPlugin);
  },
};
