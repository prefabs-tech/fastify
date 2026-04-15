import { CustomError } from "@prefabs.tech/fastify-error-handler";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ERROR_CODES } from "../../../../constants";
import getInvitationService from "../../../../lib/getInvitationService";
import createInvitation from "../createInvitation";

import type { FastifyReply } from "fastify";
import type { SessionRequest } from "supertokens-node/framework/fastify";

vi.mock("../../../../lib/getInvitationService", () => ({
  default: vi.fn(),
}));

vi.mock("../../../../lib/sendInvitation", () => ({
  default: vi.fn(),
}));

describe("createInvitation handler", () => {
  const createError = vi.fn();
  const unauthorized = vi.fn();

  const baseRequest = {
    body: {
      email: "invitee@example.com",
      role: "USER",
    },
    config: {} as SessionRequest["config"],
    dbSchema: undefined,
    headers: {},
    hostname: "localhost",
    log: { error: vi.fn() },
    server: {
      httpErrors: {
        createError,
        unauthorized,
      },
    },
    slonik: {},
    user: { id: "inviter-1" },
  } as unknown as SessionRequest;

  beforeEach(() => {
    vi.clearAllMocks();
    createError.mockReset();
    unauthorized.mockReset();
  });

  it("returns 422 body without createError when invitation already exists", async () => {
    vi.mocked(getInvitationService).mockReturnValue({
      create: vi
        .fn()
        .mockRejectedValue(
          new CustomError(
            "Invitation already exists for this email.",
            ERROR_CODES.INVITATION_ALREADY_EXISTS,
          ),
        ),
    } as never);

    const reply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as unknown as FastifyReply;

    await createInvitation(baseRequest, reply);

    expect(createError).not.toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(422);
    expect(reply.send).toHaveBeenCalledWith({
      code: ERROR_CODES.INVITATION_ALREADY_EXISTS,
      error: "Unprocessable Entity",
      message: "Invitation already exists for this email.",
      statusCode: 422,
    });
  });

  it("returns the same 422 body for other CustomError codes", async () => {
    vi.mocked(getInvitationService).mockReturnValue({
      create: vi
        .fn()
        .mockRejectedValue(new CustomError("Other message", "SOME_OTHER_CODE")),
    } as never);

    const reply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as unknown as FastifyReply;

    await createInvitation(baseRequest, reply);

    expect(createError).not.toHaveBeenCalled();
    expect(reply.code).toHaveBeenCalledWith(422);
    expect(reply.send).toHaveBeenCalledWith({
      code: "SOME_OTHER_CODE",
      error: "Unprocessable Entity",
      message: "Other message",
      statusCode: 422,
    });
  });
});
