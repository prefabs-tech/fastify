import { formatDate } from "@prefabs.tech/fastify-slonik";
import { mercurius } from "mercurius";
import { createNewSession } from "supertokens-node/recipe/session";
import { emailPasswordSignUp } from "supertokens-node/recipe/thirdpartyemailpassword";

import getInvitationService from "../../../lib/getInvitationService";
import isInvitationValid from "../../../lib/isInvitationValid";
import sendInvitation from "../../../lib/sendInvitation";
import validateEmail from "../../../validator/email";
import validatePassword from "../../../validator/password";

import type { User } from "../../../types";
import type {
  Invitation,
  InvitationCreateInput,
} from "../../../types/invitation";
import type { FilterInput, SortInput } from "@prefabs.tech/fastify-slonik";
import type { MercuriusContext } from "mercurius";

const Mutation = {
  acceptInvitation: async (
    parent: unknown,
    arguments_: {
      data: {
        email: string;
        password: string;
      };
      token: string;
    },
    context: MercuriusContext,
  ) => {
    const { app, config, database, dbSchema, reply } = context;

    const { token, data } = arguments_;

    try {
      const { email, password } = data;

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

      const service = getInvitationService(config, database, dbSchema);

      const invitation = await service.findByToken(token);

      // validate the invitation
      if (!invitation || !isInvitationValid(invitation)) {
        const mercuriusError = new mercurius.ErrorWithProps(
          "Invitation is invalid or has expired",
        );

        return mercuriusError;
      }

      // compare the FieldInput email to the invitation email
      if (invitation.email != email) {
        const mercuriusError = new mercurius.ErrorWithProps(
          "Email do not match with the invitation",
        );

        return mercuriusError;
      }

      // signup
      const signUpResponse = await emailPasswordSignUp(email, password, {
        roles: [invitation.role],
        autoVerifyEmail: true,
      });

      if (signUpResponse.status !== "OK") {
        return signUpResponse;
      }

      // update invitation's acceptedAt value with current time
      await service.update(invitation.id, {
        acceptedAt: formatDate(new Date(Date.now())),
      });

      // run post accept hook
      try {
        await config.user.invitation?.postAccept?.(
          reply.request,
          invitation,
          signUpResponse.user as unknown as User,
        );
      } catch (error) {
        app.log.error(error);
      }

      // create new session so the user be logged in on signup
      await createNewSession(reply.request, reply, signUpResponse.user.id);

      return {
        ...signUpResponse,
        user: {
          ...signUpResponse.user,
          roles: [invitation.role],
        },
      };
    } catch (error) {
      app.log.error(error);

      const mercuriusError = new mercurius.ErrorWithProps(
        "Oops! Something went wrong",
      );

      mercuriusError.statusCode = 500;

      return mercuriusError;
    }
  },
  createInvitation: async (
    parent: unknown,
    arguments_: {
      data: InvitationCreateInput;
    },
    context: MercuriusContext,
  ) => {
    const { app: server, config, database, dbSchema, reply, user } = context;

    try {
      if (!user) {
        return new mercurius.ErrorWithProps("unauthorized", {}, 401);
      }

      const { appId, email, expiresAt, payload, role } = arguments_.data;

      const service = getInvitationService(config, database, dbSchema);

      const invitationCreateInput: InvitationCreateInput = {
        appId,
        email,
        expiresAt,
        invitedById: user.id,
        role,
      };

      if (Object.keys(payload || {}).length > 0) {
        invitationCreateInput.payload = JSON.stringify(payload);
      }

      let invitation: Invitation | undefined;

      try {
        invitation = await service.create(invitationCreateInput);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        return new mercurius.ErrorWithProps(error.message, {
          code: error.code,
        });
      }

      if (invitation) {
        try {
          const { headers, hostname } = reply.request;

          const url = headers.referer || headers.origin || hostname;

          sendInvitation(server, invitation, url);
        } catch (error) {
          server.log.error(error);
        }

        return invitation;
      }
    } catch (error) {
      server.log.error(error);

      return new mercurius.ErrorWithProps(
        "Oops, Something went wrong",
        {},
        500,
      );
    }
  },
  resendInvitation: async (
    parent: unknown,
    arguments_: {
      id: number;
    },
    context: MercuriusContext,
  ) => {
    const { app, config, database, dbSchema, reply } = context;

    const service = getInvitationService(config, database, dbSchema);

    const invitation = await service.findById(arguments_.id);

    // is invitation valid
    if (!invitation || !isInvitationValid(invitation)) {
      const mercuriusError = new mercurius.ErrorWithProps(
        "Invitation is invalid or has expired",
      );

      return mercuriusError;
    }

    const { headers, hostname } = reply.request;

    const url = headers.referer || headers.origin || hostname;

    try {
      sendInvitation(app, invitation, url);
    } catch (error) {
      app.log.error(error);
    }

    return invitation;
  },
  revokeInvitation: async (
    parent: unknown,
    arguments_: {
      id: number;
    },
    context: MercuriusContext,
  ) => {
    const service = getInvitationService(
      context.config,
      context.database,
      context.dbSchema,
    );

    let invitation = await service.findById(arguments_.id);

    let errorMessage: string | undefined;

    if (!invitation) {
      errorMessage = "Invitation not found";
    } else if (invitation.acceptedAt) {
      errorMessage = "Invitation is already accepted";
    } else if (Date.now() > invitation.expiresAt) {
      errorMessage = "Invitation is expired";
    } else if (invitation.revokedAt) {
      errorMessage = "Invitation is already revoked";
    }

    if (errorMessage) {
      const mercuriusError = new mercurius.ErrorWithProps(errorMessage);

      return mercuriusError;
    }

    invitation = await service.update(arguments_.id, {
      revokedAt: formatDate(new Date(Date.now())),
    });

    return invitation;
  },
  deleteInvitation: async (
    parent: unknown,
    arguments_: {
      id: number;
    },
    context: MercuriusContext,
  ) => {
    const service = getInvitationService(
      context.config,
      context.database,
      context.dbSchema,
    );

    const invitation = await service.delete(arguments_.id);

    let errorMessage: string | undefined;

    if (!invitation) {
      errorMessage = "Invitation not found";
    }

    if (errorMessage) {
      const mercuriusError = new mercurius.ErrorWithProps(errorMessage);

      return mercuriusError;
    }

    return invitation;
  },
};

const Query = {
  getInvitationByToken: async (
    parent: unknown,
    arguments_: {
      token: string;
    },
    context: MercuriusContext,
  ) => {
    try {
      const service = getInvitationService(
        context.config,
        context.database,
        context.dbSchema,
      );

      const invitation = await service.findByToken(arguments_.token);

      return invitation;
    } catch (error) {
      context.app.log.error(error);

      return new mercurius.ErrorWithProps(
        "Oops, Something went wrong",
        {},
        500,
      );
    }
  },
  invitations: async (
    parent: unknown,
    arguments_: {
      limit: number;
      offset: number;
      filters?: FilterInput;
      sort?: SortInput[];
    },
    context: MercuriusContext,
  ) => {
    const service = getInvitationService(
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
