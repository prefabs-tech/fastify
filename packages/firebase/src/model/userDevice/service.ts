import { BaseService } from "@prefabs.tech/fastify-slonik";

import {
  UserDevice,
  UserDeviceCreateInput,
  UserDeviceUpdateInput,
} from "../../types";
import UserDeviceSqlFactory from "./sqlFactory";

class UserDeviceService extends BaseService<
  UserDevice,
  UserDeviceCreateInput,
  UserDeviceUpdateInput
> {
  get factory(): UserDeviceSqlFactory {
    return super.factory as UserDeviceSqlFactory;
  }

  get sqlFactoryClass() {
    return UserDeviceSqlFactory;
  }

  async getByUserId(userId: string): Promise<undefined | UserDevice[]> {
    const query = this.factory.getFindByUserIdSql(userId);

    const result = await this.database.connect((connection) => {
      return connection.any(query);
    });

    return result as UserDevice[];
  }

  async removeByDeviceToken(
    deviceToken: string,
  ): Promise<undefined | UserDevice> {
    const query = this.factory.getDeleteExistingTokenSql(deviceToken);

    const result = await this.database.connect((connection) => {
      return connection.maybeOne(query);
    });

    return result;
  }

  protected async preCreate(
    data: UserDeviceCreateInput,
  ): Promise<UserDeviceCreateInput> {
    const { deviceToken } = data;

    await this.removeByDeviceToken(deviceToken as string);

    return data;
  }
}

export default UserDeviceService;
