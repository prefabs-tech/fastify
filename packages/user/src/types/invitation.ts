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

type InvitationCreateInput = {
  expiresAt?: string;
  payload?: string;
} & Omit<
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
>;

type InvitationUpdateInput = Partial<
  {
    acceptedAt: string;
    expiresAt: string;
    revokedAt: string;
  } & Omit<
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
  >
>;

export type { Invitation, InvitationCreateInput, InvitationUpdateInput };
