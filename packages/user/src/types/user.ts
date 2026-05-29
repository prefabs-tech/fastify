import type { Multipart } from "@prefabs.tech/fastify-s3";

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

type UserCreateInput = Partial<
  Omit<
    User,
    "deletedAt" | "disabled" | "lastLoginAt" | "photo" | "roles" | "signedUpAt"
  >
> & {
  lastLoginAt?: string;
  signedUpAt?: string;
};

type UserUpdateInput = Partial<
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
> & {
  lastLoginAt?: string;
  photo?: Multipart;
};

export type { User, UserCreateInput, UserUpdateInput };
