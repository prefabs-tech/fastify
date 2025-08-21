import computeInvitationExpiresAt from "../../../lib/computeInvitationExpiresAt";
import getInvitationService from "../../../lib/getInvitationService";
import getUserService from "../../../lib/getUserService";
import sendInvitation from "../../../lib/sendInvitation";
import areRolesExist from "../../../supertokens/utils/areRolesExist";
import validateEmail from "../../../validator/email";

import type {
  Invitation,
  InvitationCreateInput,
} from "../../../types/invitation";
import type { FilterInput } from "@prefabs.tech/fastify-slonik";
import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify";

const createInvitation = async (
  request: SessionRequest,
  reply: FastifyReply,
) => {
  const {
    body,
    config,
    dbSchema,
    headers,
    hostname,
    log,
    server,
    slonik,
    user,
  } = request;

  if (!user) {
    throw server.httpErrors.unauthorized("Unauthorised");
  }

  const { appId, email, expiresAt, payload, role } =
    body as InvitationCreateInput;

  //  check if the email is valid
  const result = validateEmail(email, config);

  if (!result.success) {
    throw server.httpErrors.unprocessableEntity(
      result.message || "Invalid email",
    );
  }

  const userService = getUserService(config, slonik, dbSchema);

  const emailFilter = {
    key: "email",
    operator: "eq",
    value: email,
  } as FilterInput;

  const userCount = await userService.count(emailFilter);

  // check if user of the email already exists
  if (userCount > 0) {
    throw server.httpErrors.unprocessableEntity(
      `User with email ${email} already exists`,
    );
  }

  if (!(await areRolesExist([role]))) {
    throw server.httpErrors.unprocessableEntity(
      `Role "${role}" does not exist`,
    );
  }

  const service = getInvitationService(config, slonik, dbSchema);

  const invitationCreateInput: InvitationCreateInput = {
    email,
    expiresAt: computeInvitationExpiresAt(config, expiresAt),
    invitedById: user.id,
    role: role,
  };

  const app = config.apps?.find((app) => app.id == appId);

  if (app) {
    if (app.supportedRoles.includes(invitationCreateInput.role)) {
      invitationCreateInput.appId = appId;
    } else {
      throw server.httpErrors.unprocessableEntity(
        `App ${app.name} does not support role ${invitationCreateInput.role}`,
      );
    }
  }

  if (Object.keys(payload || {}).length > 0) {
    invitationCreateInput.payload = JSON.stringify(payload);
  }

  let invitation: Invitation | undefined;

  try {
    invitation = await service.create(invitationCreateInput);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    throw server.httpErrors.unprocessableEntity(error.message);
  }

  if (invitation) {
    const url = headers.referer || headers.origin || hostname;

    try {
      sendInvitation(server, invitation, url);
    } catch (error) {
      log.error(error);
    }

    const data: Partial<Invitation> = invitation;

    delete data.token;

    reply.send(data);
  }
};

export default createInvitation;
