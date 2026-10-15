import { BaseService } from "@prefabs.tech/fastify-slonik";

import type {
  ProfileField,
  ProfileFieldCreateInput,
  ProfileFieldUpdateInput,
} from "../../types/profileField";

import ProfileFieldSqlFactory from "./sqlFactory";

class ProfileFieldService extends BaseService<
  ProfileField,
  ProfileFieldCreateInput,
  ProfileFieldUpdateInput
> {
  get factory(): ProfileFieldSqlFactory {
    return super.factory as ProfileFieldSqlFactory;
  }

  get sqlFactoryClass() {
    return ProfileFieldSqlFactory;
  }
}

export default ProfileFieldService;
