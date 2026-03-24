import type { Multipart } from "@prefabs.tech/fastify-s3";
import type { User as SupertokensUser } from "supertokens-node/recipe/thirdpartyemailpassword";

interface Photo {
  id: number;
  url: string;
}

interface User {
  id: string;
  deletedAt?: number;
  disabled: boolean;
  email: string;
  lastLoginAt: number;
  photoId?: number | null;
  photo?: Photo;
  roles?: string[];
  signedUpAt: number;
}

type UserCreateInput = Partial<
  Omit<
    User,
    "disabled" | "lastLoginAt" | "roles" | "signedUpAt" | "deletedAt" | "photo"
  >
> & {
  lastLoginAt?: string;
  signedUpAt?: string;
};

type UserUpdateInput = Partial<
  Omit<
    User,
    | "id"
    | "email"
    | "lastLoginAt"
    | "roles"
    | "signedUpAt"
    | "deletedAt"
    | "photo"
  >
> & {
  lastLoginAt?: string;
  photo?: Multipart;
};

interface AuthUser extends User, SupertokensUser {}

export type { AuthUser, User, UserCreateInput, UserUpdateInput };
