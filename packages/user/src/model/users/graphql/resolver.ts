import { GraphQLFileUpload, Multipart } from "@prefabs.tech/fastify-s3";
import { mercurius } from "mercurius";
import EmailVerification, {
  EmailVerificationClaim,
  isEmailVerified,
} from "supertokens-node/recipe/emailverification";
import { createNewSession } from "supertokens-node/recipe/session";
import {
  emailPasswordSignUp,
  getUsersByEmail,
} from "supertokens-node/recipe/thirdpartyemailpassword";
import UserRoles from "supertokens-node/recipe/userroles";

import { ROLE_ADMIN, ROLE_SUPERADMIN } from "../../../constants";
import CustomApiError from "../../../customApiError";
import getUserService from "../../../lib/getUserService";
import createUserContext from "../../../supertokens/utils/createUserContext";
import ProfileValidationClaim from "../../../supertokens/utils/profileValidationClaim";
import validateEmail from "../../../validator/email";
import validatePassword from "../../../validator/password";
import filterUserUpdateInput from "../filterUserUpdateInput";

import type { UserUpdateInput } from "../../../types";
import type { FilterInput, SortInput } from "@prefabs.tech/fastify-slonik";
import type { MercuriusContext } from "mercurius";

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
      const adminUsers = await UserRoles.getUsersThatHaveRole(ROLE_ADMIN);
      const superAdminUsers =
        await UserRoles.getUsersThatHaveRole(ROLE_SUPERADMIN);

      let errorMessage: string | undefined;

      if (
        adminUsers.status === "UNKNOWN_ROLE_ERROR" &&
        superAdminUsers.status === "UNKNOWN_ROLE_ERROR"
      ) {
        errorMessage = adminUsers.status;
      } else if (
        (adminUsers.status === "OK" && adminUsers.users.length > 0) ||
        (superAdminUsers.status === "OK" && superAdminUsers.users.length > 0)
      ) {
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
      const signUpResponse = await emailPasswordSignUp(email, password, {
        autoVerifyEmail: true,
        roles: [
          ROLE_ADMIN,
          ...(superAdminUsers.status === "OK" ? [ROLE_SUPERADMIN] : []),
        ],
        _default: {
          request: {
            request: reply.request,
          },
        },
      });

      if (signUpResponse.status !== "OK") {
        const mercuriusError = new mercurius.ErrorWithProps(
          signUpResponse.status,
        );

        return mercuriusError;
      }

      // create new session so the user be logged in on signup
      await createNewSession(reply.request, reply, signUpResponse.user.id);

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
  changePassword: async (
    parent: unknown,
    arguments_: {
      oldPassword: string;
      newPassword: string;
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
        await createNewSession(reply.request, reply, user.id);
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

      request.user = updatedUser;

      if (config.user.features?.profileValidation?.enabled) {
        await request.session?.fetchAndSetClaim(
          new ProfileValidationClaim(),
          createUserContext(undefined, request),
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
      photo: {
        file: GraphQLFileUpload;
      };
    },
    context: MercuriusContext,
  ) => {
    const { app, config, database, dbSchema, reply, user } = context;
    const { photo } = arguments_;

    const service = getUserService(config, database, dbSchema);

    if (!user) {
      return new mercurius.ErrorWithProps("unauthorized", {}, 401);
    }

    if (!photo) {
      throw new CustomApiError({
        message: "Missing photo file in the request body",
        name: "ERROR_FILE_MISSING",
        statusCode: 422,
      });
    }

    try {
      const fileData = photo.file.createReadStream();

      const fileToUpload: Multipart = {
        ...photo.file,
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

      if (request.config.user.features?.profileValidation?.enabled) {
        await request.session?.fetchAndSetClaim(
          new ProfileValidationClaim(),
          createUserContext(undefined, request),
        );
      }

      if (request.config.user.features?.signUp?.emailVerification) {
        await request.session?.fetchAndSetClaim(
          EmailVerificationClaim,
          createUserContext(undefined, request),
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

      if (request.config.user.features?.profileValidation?.enabled) {
        await request.session?.fetchAndSetClaim(
          new ProfileValidationClaim(),
          createUserContext(undefined, request),
        );
      }

      if (request.config.user.features?.signUp?.emailVerification) {
        await request.session?.fetchAndSetClaim(
          EmailVerificationClaim,
          createUserContext(undefined, request),
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
  changeEmail: async (
    parent: unknown,
    arguments_: {
      email: string;
    },
    context: MercuriusContext,
  ) => {
    const { app, config, database, dbSchema, user, reply } = context;

    try {
      if (user) {
        if (config.user.features?.updateEmail?.enabled === false) {
          return new mercurius.ErrorWithProps("EMAIL_FEATURE_DISABLED_ERROR");
        }

        const request = reply.request;

        if (config.user.features?.profileValidation?.enabled) {
          await request.session?.fetchAndSetClaim(
            new ProfileValidationClaim(),
            createUserContext(undefined, request),
          );
        }

        if (config.user.features?.signUp?.emailVerification) {
          await request.session?.fetchAndSetClaim(
            EmailVerificationClaim,
            createUserContext(undefined, request),
          );
        }

        const emailValidationResult = validateEmail(arguments_.email, config);

        if (!emailValidationResult.success) {
          return new mercurius.ErrorWithProps("EMAIL_INVALID_ERROR");
        }

        if (user.email === arguments_.email) {
          return new mercurius.ErrorWithProps("EMAIL_SAME_AS_CURRENT_ERROR");
        }

        if (config.user.features?.signUp?.emailVerification) {
          const isVerified = await isEmailVerified(user.id, arguments_.email);

          if (!isVerified) {
            const users = await getUsersByEmail(arguments_.email);

            const emailPasswordRecipeUsers = users.filter(
              (user) => !user.thirdParty,
            );

            if (emailPasswordRecipeUsers.length > 0) {
              return new mercurius.ErrorWithProps("EMAIL_ALREADY_EXISTS_ERROR");
            }

            const tokenResponse =
              await EmailVerification.createEmailVerificationToken(
                user.id,
                arguments_.email,
              );

            if (tokenResponse.status === "OK") {
              await EmailVerification.sendEmail({
                type: "EMAIL_VERIFICATION",
                user: {
                  id: user.id,
                  email: arguments_.email,
                },
                emailVerifyLink: `${config.appOrigin[0]}/auth/verify-email?token=${tokenResponse.token}&rid=emailverification`,
                userContext: {
                  _default: {
                    request: {
                      request: request,
                    },
                  },
                },
              });

              return {
                status: "OK",
                message: "A verification link has been sent to your email.",
              };
            }

            return new mercurius.ErrorWithProps(tokenResponse.status);
          }
        }

        const service = getUserService(config, database, dbSchema);

        const response = await service.changeEmail(user.id, arguments_.email);

        request.user = response;

        return {
          status: "OK",
          message: "Email updated successfully.",
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
      const adminUsers = await UserRoles.getUsersThatHaveRole(ROLE_ADMIN);
      const superAdminUsers =
        await UserRoles.getUsersThatHaveRole(ROLE_SUPERADMIN);

      if (
        adminUsers.status === "UNKNOWN_ROLE_ERROR" &&
        superAdminUsers.status === "UNKNOWN_ROLE_ERROR"
      ) {
        const mercuriusError = new mercurius.ErrorWithProps(adminUsers.status);

        return mercuriusError;
      } else if (
        (adminUsers.status === "OK" && adminUsers.users.length > 0) ||
        (superAdminUsers.status === "OK" && superAdminUsers.users.length > 0)
      ) {
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

      await request.session?.fetchAndSetClaim(
        new ProfileValidationClaim(),
        createUserContext(undefined, request),
      );
    }

    return user;
  },
  users: async (
    parent: unknown,
    arguments_: {
      limit: number;
      offset: number;
      filters?: FilterInput;
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
