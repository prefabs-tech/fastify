import type { Multipart } from "@prefabs.tech/fastify-s3";
import type { User as SupertokensUser } from "supertokens-node/recipe/thirdpartyemailpassword";

interface AuthUser extends SupertokensUser, User {}

interface Photo {
  id: number;
  url: string;
}

interface User {
  deletedAt?: number;
  disabled: boolean;
  email: string;
  id: string;
  lastLoginAt: number;
  photo?: Photo;
  photoId?: null | number;
  roles?: string[];
  signedUpAt: number;
}

type UserCreateInput = {
  lastLoginAt?: string;
  signedUpAt?: string;
} & Partial<
  Omit<
    User,
    "deletedAt" | "disabled" | "lastLoginAt" | "photo" | "roles" | "signedUpAt"
  >
>;

type UserUpdateInput = {
  lastLoginAt?: string;
  photo?: Multipart;
} & Partial<
  Omit<
    User,
    | "deletedAt"
    | "email"
    | "id"
    | "lastLoginAt"
    | "photo"
    | "roles"
    | "signedUpAt"
  >
>;

export type { AuthUser, User, UserCreateInput, UserUpdateInput };
