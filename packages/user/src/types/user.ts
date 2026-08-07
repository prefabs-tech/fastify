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
  profile?: { [key: string]: boolean | null | number | string };
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
    | "profile"
    | "roles"
    | "signedUpAt"
  >
> & {
  lastLoginAt?: string;
  photo?: Multipart;
  profile?: string;
};

export type { User, UserCreateInput, UserUpdateInput };
