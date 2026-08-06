import type { FastifyReply, FastifyRequest } from "fastify";

import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockCreateNewSession,
  mockEmailPasswordSignUp,
  mockGetAllRoles,
  mockGetUsersThatHaveRole,
} = vi.hoisted(() => ({
  mockCreateNewSession: vi.fn(),
  mockEmailPasswordSignUp: vi.fn(),
  mockGetAllRoles: vi.fn(),
  mockGetUsersThatHaveRole: vi.fn(),
}));

vi.mock("../../../../auth/adapter", () => ({
  auth: {
    emailPassword: {
      emailPasswordSignUp: mockEmailPasswordSignUp,
    },
    roles: {
      getAllRoles: mockGetAllRoles,
      getUsersThatHaveRole: mockGetUsersThatHaveRole,
    },
    session: {
      createNewSession: mockCreateNewSession,
    },
  },
}));

import adminSignUp from "../adminSignUp";

const httpError = (statusCode: number, message: string) => {
  const error = new Error(message) as Error & { statusCode: number };

  error.statusCode = statusCode;

  return error;
};

const buildRequest = (body: {
  email: string;
  password: string;
}): FastifyRequest => {
  return {
    body,
    config: {
      user: {
        password: {},
      },
    },
    server: {
      httpErrors: {
        conflict: (message: string) => httpError(409, message),
        unprocessableEntity: (message: string) => httpError(422, message),
      },
    },
  } as unknown as FastifyRequest;
};

const buildReply = () => {
  const reply = {
    send: vi.fn().mockReturnThis(),
  };

  return reply as unknown as FastifyReply & { send: ReturnType<typeof vi.fn> };
};

describe("adminSignUp handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws unprocessableEntity when required roles are missing", async () => {
    mockGetUsersThatHaveRole.mockResolvedValue([]);
    mockGetAllRoles.mockResolvedValue(["USER"]);

    await expect(
      adminSignUp(
        buildRequest({
          email: "admin@example.com",
          password: "aaaaaaa1",
        }),
        buildReply(),
      ),
    ).rejects.toMatchObject({
      message: "Required roles not found",
      statusCode: 422,
    });
  });

  it("throws conflict when an admin user already exists", async () => {
    mockGetUsersThatHaveRole.mockImplementation(async (role: string) =>
      role === "ADMIN" ? ["existing-admin"] : [],
    );

    await expect(
      adminSignUp(
        buildRequest({
          email: "admin@example.com",
          password: "aaaaaaa1",
        }),
        buildReply(),
      ),
    ).rejects.toMatchObject({
      message: "First admin user already exists",
      statusCode: 409,
    });
  });

  it("sends OK with user and creates a session on success", async () => {
    mockGetUsersThatHaveRole.mockResolvedValue([]);
    mockGetAllRoles.mockResolvedValue(["ADMIN", "SUPERADMIN", "USER"]);
    mockEmailPasswordSignUp.mockResolvedValue({
      success: true,
      user: { email: "admin@example.com", id: "user-1" },
    });
    mockCreateNewSession.mockResolvedValue({});

    const request = buildRequest({
      email: "admin@example.com",
      password: "aaaaaaa1",
    });
    const reply = buildReply();

    await adminSignUp(request, reply);

    expect(mockEmailPasswordSignUp).toHaveBeenCalledWith(
      "admin@example.com",
      "aaaaaaa1",
      expect.objectContaining({
        autoVerifyEmail: true,
        roles: ["ADMIN", "SUPERADMIN"],
      }),
    );
    expect(mockCreateNewSession).toHaveBeenCalledWith(request, reply, "user-1");
    expect(reply.send).toHaveBeenCalledWith({
      status: "OK",
      user: { email: "admin@example.com", id: "user-1" },
    });
  });

  it("sends signup error status when emailPasswordSignUp fails", async () => {
    mockGetUsersThatHaveRole.mockResolvedValue([]);
    mockGetAllRoles.mockResolvedValue(["ADMIN", "SUPERADMIN", "USER"]);
    mockEmailPasswordSignUp.mockResolvedValue({
      error: "EMAIL_ALREADY_EXISTS_ERROR",
      success: false,
    });

    const reply = buildReply();

    await adminSignUp(
      buildRequest({
        email: "admin@example.com",
        password: "aaaaaaa1",
      }),
      reply,
    );

    expect(mockCreateNewSession).not.toHaveBeenCalled();
    expect(reply.send).toHaveBeenCalledWith({
      status: "EMAIL_ALREADY_EXISTS_ERROR",
    });
  });
});
