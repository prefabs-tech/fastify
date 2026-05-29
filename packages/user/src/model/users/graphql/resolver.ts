import type { FilterInput, SortInput } from "@prefabs.tech/fastify-slonik";
import type { FastifyRequest } from "fastify";
import type { MercuriusContext } from "mercurius";

import { GraphQLUpload, Multipart } from "@prefabs.tech/fastify-s3";
import { mercurius } from "mercurius";

import type { AuthSession } from "../../../auth/adapter";
import type { UserUpdateInput } from "../../../types";

import { auth } from "../../../auth/adapter";
import { ROLE_ADMIN, ROLE_SUPERADMIN } from "../../../constants";
import CustomApiError from "../../../customApiError";
import getUserService from "../../../lib/getUserService";
import validateEmail from "../../../validator/email";
import validatePassword from "../../../validator/password";
import filterUserUpdateInput from "../filterUserUpdateInput";

const Mutation = {
  adminSignUp: async (
    parent: unknown,
    arguments_: {
      data: {
        email: string;
        password: string;
      };
    },
    context: MercuriusContext,
  ) => {
    const { app, config, reply } = context;

    try {
      const { email, password } = arguments_.data;

      // check if already admin user exists
      const adminUsers = await auth.roles.getUsersThatHaveRole(ROLE_ADMIN);
      const superAdminUsers =
        await auth.roles.getUsersThatHaveRole(ROLE_SUPERADMIN);

      let errorMessage: string | undefined;

      if (adminUsers.length === 0 && superAdminUsers.length === 0) {
        const allRoles = await auth.roles.getAllRoles();

        if (
          !allRoles.includes(ROLE_ADMIN) &&
          !allRoles.includes(ROLE_SUPERADMIN)
        ) {
          errorMessage = "UNKNOWN_ROLE_ERROR";
        }
      } else if (adminUsers.length > 0 || superAdminUsers.length > 0) {
        errorMessage = "First admin user already exists";
      }

      if (errorMessage) {
        const mercuriusError = new mercurius.ErrorWithProps(errorMessage);

        return mercuriusError;
      }

      //  check if the email is valid
      const emailResult = validateEmail(email, config);

      if (!emailResult.success && emailResult.message) {
        const mercuriusError = new mercurius.ErrorWithProps(
          emailResult.message,
        );

        return mercuriusError;
      }

      // password strength validation
      const passwordStrength = validatePassword(password, config);

      if (!passwordStrength.success && passwordStrength.message) {
        const mercuriusError = new mercurius.ErrorWithProps(
          passwordStrength.message,
        );

        return mercuriusError;
      }

      // signup
      const signUpResponse = await auth.emailPassword.emailPasswordSignUp(
        email,
        password,
        {
          autoVerifyEmail: true,
          roles: [
            ROLE_ADMIN,
            ...(superAdminUsers.length > 0 ? [ROLE_SUPERADMIN] : []),
          ],
        },
      );

      if (!signUpResponse.success) {
        const mercuriusError = new mercurius.ErrorWithProps(
          signUpResponse.error || "UNKNOWN_ERROR",
        );

        return mercuriusError;
      }

      // create new session so the user be logged in on signup
      await auth.session.createNewSession(
        reply.request,
        reply,
        signUpResponse.user.id,
      );

      return signUpResponse;
    } catch (error) {
      // FIXME [OP 28 SEP 2022]
      app.log.error(error);

      const mercuriusError = new mercurius.ErrorWithProps(
        "Oops, Something went wrong",
      );

      mercuriusError.statusCode = 500;

      return mercuriusError;
    }
  },
  changeEmail: async (
    parent: unknown,
    arguments_: {
      email: string;
    },
    context: MercuriusContext,
  ) => {
    const { app, config, database, dbSchema, reply, user } = context;

    try {
      if (user) {
        if (config.user.features?.updateEmail?.enabled === false) {
          return new mercurius.ErrorWithProps("EMAIL_FEATURE_DISABLED_ERROR");
        }

        const request = reply.request;
        const session = (request as FastifyRequest & { session: AuthSession })
          .session;
        const userContext = auth.createUserContext(request);

        if (config.user.features?.profileValidation?.enabled) {
          await auth.claims.refreshSessionClaims(
            session,
            request,
            ["profileValidation"],
            userContext,
          );
        }

        if (config.user.features?.signUp?.emailVerification) {
          await auth.claims.refreshSessionClaims(
            session,
            request,
            ["emailVerification"],
            userContext,
          );
        }

        const emailValidationResult = validateEmail(arguments_.email, config);

        if (!emailValidationResult.success) {
          return new mercurius.ErrorWithProps("EMAIL_INVALID_ERROR");
        }

        if (user.email === arguments_.email) {
          return new mercurius.ErrorWithProps("EMAIL_SAME_AS_CURRENT_ERROR");
        }

        if (
          config.user.features?.signUp?.emailVerification &&
          auth.emailVerification
        ) {
          const isVerified = await auth.emailVerification.isEmailVerified(
            user.id,
            arguments_.email,
          );

          if (!isVerified) {
            const users =
              (await auth.emailPassword.getUsersByEmail?.(arguments_.email)) ||
              [];

            const emailPasswordRecipeUsers = users.filter(
              (user) => !(user as Record<string, unknown>).thirdParty,
            );

            if (emailPasswordRecipeUsers.length > 0) {
              return new mercurius.ErrorWithProps("EMAIL_ALREADY_EXISTS_ERROR");
            }

            const token =
              await auth.emailVerification.createEmailVerificationToken(
                user.id,
                arguments_.email,
                userContext,
              );

            if (token) {
              await auth.emailVerification.sendVerificationEmail?.({
                appOrigin: config.appOrigin[0] as string,
                email: arguments_.email,
                token,
                userContext,
                userId: user.id,
              });

              return {
                message: "A verification link has been sent to your email.",
                status: "OK",
              };
            }

            return new mercurius.ErrorWithProps(
              "EMAIL_VERIFICATION_TOKEN_FAILED",
            );
          }
        }

        const service = getUserService(config, database, dbSchema);

        const response = await service.changeEmail(user.id, arguments_.email);

        request.user = response;

        return {
          message: "Email updated successfully.",
          status: "OK",
        };
      } else {
        return new mercurius.ErrorWithProps("USER_NOT_FOUND");
      }
      /*eslint-disable-next-line @typescript-eslint/no-explicit-any */
    } catch (error: any) {
      app.log.error(error);

      if (error.message === "EMAIL_ALREADY_EXISTS_ERROR") {
        return new mercurius.ErrorWithProps(error.message);
      }

      return new mercurius.ErrorWithProps(
        "Oops, Something went wrong",
        {},
        500,
      );
    }
  },
  changePassword: async (
    parent: unknown,
    arguments_: {
      newPassword: string;
      oldPassword: string;
    },
    context: MercuriusContext,
  ) => {
    const { app, config, database, dbSchema, reply, user } = context;

    const service = getUserService(config, database, dbSchema);

    if (!user) {
      return new mercurius.ErrorWithProps("unauthorized", {}, 401);
    }

    try {
      const response = await service.changePassword(
        user.id,
        arguments_.oldPassword,
        arguments_.newPassword,
      );

      if (response.status === "OK") {
        await auth.session.createNewSession(reply.request, reply, user.id);
      }

      return response;
    } catch (error) {
      // FIXME [OP 28 SEP 2022]
      app.log.error(error);

      const mercuriusError = new mercurius.ErrorWithProps(
        "Oops, Something went wrong",
      );
      mercuriusError.statusCode = 500;

      return mercuriusError;
    }
  },
  deleteMe: async (
    parent: unknown,
    arguments_: {
      password: string;
    },
    context: MercuriusContext,
  ) => {
    const { app, config, database, dbSchema, user } = context;

    try {
      if (!user) {
        return new mercurius.ErrorWithProps("unauthorized", {}, 401);
      }

      const service = getUserService(config, database, dbSchema);

      await service.deleteMe(user.id, arguments_.password);

      return {
        status: "OK",
      };
    } catch (error) {
      if (error instanceof CustomApiError) {
        const mercuriusError = new mercurius.ErrorWithProps(error.name);

        mercuriusError.statusCode = error.statusCode;

        return mercuriusError;
      }

      app.log.error(error);

      const mercuriusError = new mercurius.ErrorWithProps(
        "Oops, Something went wrong",
      );

      mercuriusError.statusCode = 500;

      return mercuriusError;
    }
  },
  disableUser: async (
    parent: unknown,
    arguments_: {
      id: string;
    },
    context: MercuriusContext,
  ) => {
    const { id } = arguments_;

    if (context.user?.id === id) {
      const mercuriusError = new mercurius.ErrorWithProps(
        `you cannot disable yourself`,
      );

      mercuriusError.statusCode = 409;

      return mercuriusError;
    }

    const service = getUserService(
      context.config,
      context.database,
      context.dbSchema,
    );

    const response = await service.update(id, { disabled: true });

    if (!response) {
      return new mercurius.ErrorWithProps(`user id ${id} not found`, {}, 404);
    }

    return { status: "OK" };
  },
  enableUser: async (
    parent: unknown,
    arguments_: {
      id: string;
    },
    context: MercuriusContext,
  ) => {
    const { id } = arguments_;

    const service = getUserService(
      context.config,
      context.database,
      context.dbSchema,
    );

    const response = await service.update(id, { disabled: false });

    if (!response) {
      return new mercurius.ErrorWithProps(`user id ${id} not found`, {}, 404);
    }

    return { status: "OK" };
  },
  removePhoto: async (
    parent: unknown,
    arguments_: undefined,
    context: MercuriusContext,
  ) => {
    const { app, config, database, dbSchema, reply, user } = context;

    const service = getUserService(config, database, dbSchema);

    if (!user) {
      return new mercurius.ErrorWithProps("unauthorized", {}, 401);
    }

    try {
      // eslint-disable-next-line unicorn/no-null
      const updatedUser = await service.update(user.id, { photoId: null });

      if (user.photoId) {
        await service.fileService.delete(user.photoId);
      }

      const request = reply.request;

      request.user = updatedUser;

      const userContext = auth.createUserContext(request);
      const session = (request as FastifyRequest & { session: AuthSession })
        .session;

      if (request.config.user.features?.profileValidation?.enabled) {
        await auth.claims.refreshSessionClaims(
          session,
          request,
          ["profileValidation"],
          userContext,
        );
      }

      if (request.config.user.features?.signUp?.emailVerification) {
        await auth.claims.refreshSessionClaims(
          session,
          request,
          ["emailVerification"],
          userContext,
        );
      }

      return updatedUser;
    } catch (error) {
      app.log.error(error);

      const mercuriusError = new mercurius.ErrorWithProps(
        "Oops, Something went wrong",
      );
      mercuriusError.statusCode = 500;

      return mercuriusError;
    }
  },
  updateMe: async (
    parent: unknown,
    arguments_: {
      data: UserUpdateInput;
    },
    context: MercuriusContext,
  ) => {
    const { app, config, database, dbSchema, reply, user } = context;
    const { data } = arguments_;

    const service = getUserService(config, database, dbSchema);

    if (!user) {
      return new mercurius.ErrorWithProps("unauthorized", {}, 401);
    }

    try {
      filterUserUpdateInput(data);

      const updatedUser = await service.update(user.id, data);

      const request = reply.request;
      const session = (request as FastifyRequest & { session: AuthSession })
        .session;

      request.user = updatedUser;

      if (config.user.features?.profileValidation?.enabled) {
        await auth.claims.refreshSessionClaims(
          session,
          request,
          ["profileValidation"],
          auth.createUserContext(request),
        );
      }

      return updatedUser;
    } catch (error) {
      app.log.error(error);

      const mercuriusError = new mercurius.ErrorWithProps(
        "Oops, Something went wrong",
      );
      mercuriusError.statusCode = 500;

      return mercuriusError;
    }
  },
  uploadPhoto: async (
    parent: unknown,
    arguments_: {
      photo: GraphQLUpload;
    },
    context: MercuriusContext,
  ) => {
    const { app, config, database, dbSchema, reply, user } = context;
    const photo = await arguments_.photo;
    const { file: photoFile } = photo;

    const service = getUserService(config, database, dbSchema);

    if (!user) {
      return new mercurius.ErrorWithProps("unauthorized", {}, 401);
    }

    if (!photoFile) {
      return new mercurius.ErrorWithProps(
        "Missing photo file in the request body",
        {},
        422,
      );
    }

    try {
      const fileData = photoFile.createReadStream();

      const fileToUpload: Multipart = {
        ...photoFile,
        data: fileData,
        limit: false,
      };

      const file = await service.uploadPhoto(fileToUpload, user.id, user.id);

      const updatedUser = await service.update(user.id, {
        ...(file && {
          photoId: file.id as number,
        }),
      });

      if (user.photoId && user.photoId !== updatedUser.photoId) {
        await service.fileService.delete(user.photoId);
      }

      const request = reply.request;

      request.user = updatedUser;

      const userContext = auth.createUserContext(request);
      const session = (request as FastifyRequest & { session: AuthSession })
        .session;

      if (request.config.user.features?.profileValidation?.enabled) {
        await auth.claims.refreshSessionClaims(
          session,
          request,
          ["profileValidation"],
          userContext,
        );
      }

      if (request.config.user.features?.signUp?.emailVerification) {
        await auth.claims.refreshSessionClaims(
          session,
          request,
          ["emailVerification"],
          userContext,
        );
      }

      return updatedUser;
    } catch (error) {
      if (error instanceof CustomApiError) {
        const mercuriusError = new mercurius.ErrorWithProps(error.name);

        mercuriusError.statusCode = error.statusCode;

        return mercuriusError;
      }

      app.log.error(error);

      const mercuriusError = new mercurius.ErrorWithProps(
        "Oops, Something went wrong",
      );
      mercuriusError.statusCode = 500;

      return mercuriusError;
    }
  },
};

const Query = {
  canAdminSignUp: async (
    parent: unknown,
    arguments_: { id: string },
    context: MercuriusContext,
  ) => {
    const { app } = context;

    try {
      // check if already admin user exists
      const adminUsers = await auth.roles.getUsersThatHaveRole(ROLE_ADMIN);
      const superAdminUsers =
        await auth.roles.getUsersThatHaveRole(ROLE_SUPERADMIN);

      if (adminUsers.length === 0 && superAdminUsers.length === 0) {
        const allRoles = await auth.roles.getAllRoles();

        if (
          !allRoles.includes(ROLE_ADMIN) &&
          !allRoles.includes(ROLE_SUPERADMIN)
        ) {
          const mercuriusError = new mercurius.ErrorWithProps(
            "UNKNOWN_ROLE_ERROR",
          );

          return mercuriusError;
        }
      }

      if (adminUsers.length > 0 || superAdminUsers.length > 0) {
        return { signUp: false };
      }

      return { signUp: true };
    } catch (error) {
      app.log.error(error);

      const mercuriusError = new mercurius.ErrorWithProps(
        "Oops! Something went wrong",
      );

      mercuriusError.statusCode = 500;

      return mercuriusError;
    }
  },
  me: async (
    parent: unknown,
    arguments_: Record<string, never>,
    context: MercuriusContext,
  ) => {
    if (context.user) {
      return context.user;
    } else {
      context.app.log.error(
        "Could not able to get user from mercurius context",
      );

      const mercuriusError = new mercurius.ErrorWithProps(
        "Oops, Something went wrong",
      );

      mercuriusError.statusCode = 500;

      return mercuriusError;
    }
  },
  user: async (
    parent: unknown,
    arguments_: { id: string },
    context: MercuriusContext,
  ) => {
    const service = getUserService(
      context.config,
      context.database,
      context.dbSchema,
    );

    const user = await service.findById(arguments_.id);

    if (context.config.user.features?.profileValidation?.enabled) {
      const request = context.reply.request;

      const session = (request as FastifyRequest & { session: AuthSession })
        .session;
      await auth.claims.refreshSessionClaims(
        session,
        request,
        ["profileValidation"],
        auth.createUserContext(request),
      );
    }

    return user;
  },
  users: async (
    parent: unknown,
    arguments_: {
      filters?: FilterInput;
      limit: number;
      offset: number;
      sort?: SortInput[];
    },
    context: MercuriusContext,
  ) => {
    const service = getUserService(
      context.config,
      context.database,
      context.dbSchema,
    );

    return await service.list(
      arguments_.limit,
      arguments_.offset,
      arguments_.filters
        ? JSON.parse(JSON.stringify(arguments_.filters))
        : undefined,
      arguments_.sort ? JSON.parse(JSON.stringify(arguments_.sort)) : undefined,
    );
  },
};

export default { Mutation, Query };
