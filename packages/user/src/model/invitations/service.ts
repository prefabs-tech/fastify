import { CustomError } from "@prefabs.tech/fastify-error-handler";
import { formatDate, BaseService } from "@prefabs.tech/fastify-slonik";

import InvitationSqlFactory from "./sqlFactory";
import { ERROR_CODES } from "../../constants";
import computeInvitationExpiresAt from "../../lib/computeInvitationExpiresAt";
import getUserService from "../../lib/getUserService";
import areRolesExist from "../../supertokens/utils/areRolesExist";
import validateEmail from "../../validator/email";

import type {
  Invitation,
  InvitationCreateInput,
  InvitationUpdateInput,
} from "../../types";
import type { FilterInput } from "@prefabs.tech/fastify-slonik";

class InvitationService extends BaseService<
  Invitation,
  InvitationCreateInput,
  InvitationUpdateInput
> {
  async findByToken(token: string): Promise<Invitation | null> {
    if (!this.validateUUID(token)) {
      // eslint-disable-next-line unicorn/no-null
      return null;
    }

    const query = this.factory.getFindByTokenSql(token);

    const result = await this.database.connect((connection) => {
      return connection.maybeOne(query);
    });

    return result;
  }

  get factory(): InvitationSqlFactory {
    return super.factory as InvitationSqlFactory;
  }

  get sqlFactoryClass() {
    return InvitationSqlFactory;
  }

  protected async preCreate(
    data: InvitationCreateInput,
  ): Promise<InvitationCreateInput> {
    const { appId, email, expiresAt, role } = data;

    const result = validateEmail(email, this.config);

    if (!result.success) {
      throw new CustomError(
        result.message || "Invalid email",
        ERROR_CODES.INVALID_EMAIL,
      );
    }

    const userService = getUserService(this.config, this.database, this.schema);

    const emailFilter = {
      key: "email",
      operator: "eq",
      value: email,
    } as FilterInput;

    const userCount = await userService.count(emailFilter);

    // check if user of the email already exists
    if (userCount > 0) {
      throw new CustomError(
        `User with email ${email} already exists`,
        ERROR_CODES.USER_ALREADY_EXISTS,
      );
    }

    if (!(await areRolesExist([role]))) {
      throw new CustomError(
        `Role "${role}" does not exist`,
        ERROR_CODES.ROLE_NOT_FOUND,
      );
    }

    const app = this.config.apps?.find((app) => app.id == appId);

    if (app && !app.supportedRoles.includes(role)) {
      throw new CustomError(
        `App ${app.name} does not support role ${role}`,
        ERROR_CODES.ROLE_NOT_SUPPORTED,
      );
    }

    const filters = {
      AND: [
        { key: "email", operator: "eq", value: email },
        { key: "acceptedAt", operator: "eq", value: "null" },
        { key: "expiresAt", operator: "gt", value: formatDate(new Date()) },
        { key: "revokedAt", operator: "eq", value: "null" },
      ],
    } as FilterInput;

    const validInvitationCount = await this.count(filters);

    // only one valid invitation is allowed per email
    if (validInvitationCount > 0) {
      throw new CustomError(
        "Invitation already exists for this email.",
        ERROR_CODES.INVITATION_ALREADY_EXISTS,
      );
    }

    return {
      ...data,
      expiresAt: computeInvitationExpiresAt(this.config, expiresAt),
    };
  }

  protected validateUUID(uuid: string): boolean {
    const regexp = /^[\da-f]{8}(?:\b-[\da-f]{4}){3}\b-[\da-f]{12}$/gi;

    return regexp.test(uuid);
  }
}

export default InvitationService;
