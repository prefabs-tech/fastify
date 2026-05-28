import type { FastifyInstance } from "fastify";

import { CustomError } from "@prefabs.tech/fastify-error-handler";
import EmailVerification from "supertokens-node/recipe/emailverification";
import Session from "supertokens-node/recipe/session";
import ThirdPartyEmailPassword from "supertokens-node/recipe/thirdpartyemailpassword";
import UserRoles from "supertokens-node/recipe/userroles";

import type {
  AuthProvider,
  AuthResult,
  AuthSession,
  AuthUser,
  AuthUserContext,
  EmailPasswordProvider,
  EmailVerificationProvider,
  ResetPasswordResult,
  RolesProvider,
  SessionProvider,
  UpdateEmailOrPasswordResult,
} from "./adapter";

import { ERROR_CODES } from "../constants";
import supertokensPlugin from "../supertokens";

// SuperTokens adapter that wraps SuperTokens API to match provider-agnostic interface
const supertokensEmailPasswordAdapter: EmailPasswordProvider = {
  async createResetPasswordToken(userId: string): Promise<string> {
    const response =
      await ThirdPartyEmailPassword.createResetPasswordToken(userId);

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
      email,
      password,
      userContext,
    );

    if (response.status === "OK" && response.user) {
      return {
        success: true,
        user: {
          email: response.user.email,
          id: response.user.id,
          timeJoined: response.user.timeJoined,
        },
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
      email,
      password,
      userContext,
    );

    if (response.status === "OK" && response.user) {
      return {
        success: true,
        user: {
          email: response.user.email,
          id: response.user.id,
          timeJoined: response.user.timeJoined,
        },
      };
    }

    return {
      error: response.status,
      success: false,
    };
  },

  async getUserById(userId: string): Promise<AuthUser | undefined> {
    const user = await ThirdPartyEmailPassword.getUserById(userId);

    if (!user) return undefined;

    return {
      email: user.email,
      id: user.id,
      timeJoined: user.timeJoined,
    };
  },

  async getUsersByEmail(email: string): Promise<AuthUser[]> {
    const users = await ThirdPartyEmailPassword.getUsersByEmail(email);

    return users.map((user) => ({
      email: user.email,
      id: user.id,
      timeJoined: user.timeJoined,
    }));
  },

  async resetPasswordUsingToken(
    token: string,
    newPassword: string,
  ): Promise<ResetPasswordResult> {
    const response = await ThirdPartyEmailPassword.resetPasswordUsingToken(
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
    const response = await ThirdPartyEmailPassword.updateEmailOrPassword(input);

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
      userId,
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
    return EmailVerification.isEmailVerified(userId, email);
  },

  async unverifyEmail(userId: string, email?: string): Promise<void> {
    await EmailVerification.unverifyEmail(userId, email);
  },

  async verifyEmailUsingToken(
    token: string,
    userContext?: AuthUserContext,
  ): Promise<boolean> {
    const response = await EmailVerification.verifyEmailUsingToken(
      token,
      userContext,
    );

    return response.status === "OK";
  },
};

const supertokensRolesAdapter: RolesProvider = {
  async addRoleToUser(userId: string, role: string): Promise<void> {
    const response = await UserRoles.addRoleToUser(userId, role);

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
    const response = await UserRoles.getRolesForUser(userId);
    return response.roles;
  },

  async getUsersThatHaveRole(role: string): Promise<string[]> {
    const response = await UserRoles.getUsersThatHaveRole(role);

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
};

const supertokensSessionAdapter: SessionProvider = {
  async createNewSession(
    request,
    reply,
    userId,
    accessTokenPayload,
    sessionData,
  ): Promise<AuthSession> {
    return Session.createNewSession(
      request,
      reply,
      userId,
      accessTokenPayload,
      sessionData,
    ) as unknown as AuthSession;
  },

  async getSession(request, reply, options): Promise<AuthSession | undefined> {
    return Session.getSession(request, reply, options) as unknown as
      | AuthSession
      | undefined;
  },

  async revokeAllSessionsForUser(userId: string): Promise<void> {
    await Session.revokeAllSessionsForUser(userId);
  },
};

export const supertokensProvider: AuthProvider = {
  adapter: {
    emailPassword: supertokensEmailPasswordAdapter,
    emailVerification: supertokensEmailVerificationAdapter,
    roles: supertokensRolesAdapter,
    session: supertokensSessionAdapter,
  },
  init: async (fastify: FastifyInstance) => {
    await fastify.register(supertokensPlugin);
  },
};
