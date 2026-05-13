import type { User } from "./index";

interface Invitation {
  acceptedAt?: number;
  appId?: number;
  createdAt: number;
  email: string;
  expiresAt: number;
  id: number;
  invitedBy?: User;
  invitedById: string;
  payload?: Record<string, unknown>;
  revokedAt?: number;
  role: string;
  token: string;
  updatedAt: number;
}

type InvitationCreateInput = Omit<
  Invitation,
  | "acceptedAt"
  | "createdAt"
  | "expiresAt"
  | "id"
  | "invitedBy"
  | "payload"
  | "revokedAt"
  | "token"
  | "updatedAt"
> & {
  expiresAt?: string;
  payload?: string;
};

type InvitationUpdateInput = Partial<
  Omit<
    Invitation,
    | "acceptedAt"
    | "appId"
    | "createdAt"
    | "email"
    | "expiresAt"
    | "id"
    | "invitedBy"
    | "invitedById"
    | "payload"
    | "revokedAt"
    | "role"
    | "token"
    | "updatedAt"
  > & {
    acceptedAt: string;
    expiresAt: string;
    revokedAt: string;
  }
>;

export type { Invitation, InvitationCreateInput, InvitationUpdateInput };
