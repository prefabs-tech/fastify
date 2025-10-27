import { CustomError } from "@prefabs.tech/fastify-error-handler";
import { formatDate, BaseService } from "@prefabs.tech/fastify-slonik";

import InvitationSqlFactory from "./sqlFactory";
import { ERROR_CODES } from "../../constants";

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
    const filters = {
      AND: [
        { key: "email", operator: "eq", value: data.email },
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

    return data;
  }

  protected validateUUID(uuid: string): boolean {
    const regexp = /^[\da-f]{8}(?:\b-[\da-f]{4}){3}\b-[\da-f]{12}$/gi;

    return regexp.test(uuid);
  }
}

export default InvitationService;
