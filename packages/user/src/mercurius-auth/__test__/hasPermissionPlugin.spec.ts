import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockMercuriusAuth } = vi.hoisted(() => ({
  mockMercuriusAuth: vi.fn(async () => {}),
}));

vi.mock("mercurius-auth", () => ({ default: mockMercuriusAuth }));

import plugin from "../hasPermissionPlugin";

const directive = {
  arguments: [
    { name: { value: "permission" }, value: { value: "posts:delete" } },
  ],
};

const getApplyPolicy = async () => {
  const fastify = Fastify({ logger: false });
  await fastify.register(plugin);
  await fastify.ready();
  await fastify.close();

  const calls = mockMercuriusAuth.mock.calls as unknown as [
    unknown,
    { applyPolicy: (...arguments_: unknown[]) => Promise<unknown> },
  ][];

  return calls[0][1].applyPolicy;
};

describe("@hasPermission directive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checks the permission through request.hasPermission", async () => {
    const request = {
      hasPermission: vi.fn().mockResolvedValue(true),
      user: { id: "user-1" },
    };
    const applyPolicy = await getApplyPolicy();

    const result = await applyPolicy(
      directive,
      {},
      {},
      {
        reply: { request },
        user: request.user,
      },
    );

    expect(result).toBe(true);
    expect(request.hasPermission).toHaveBeenCalledWith("posts:delete");
  });

  it("returns a 403 with the claim error when the check refuses", async () => {
    const request = {
      hasPermission: vi.fn().mockResolvedValue(false),
      user: { id: "user-1" },
    };
    const applyPolicy = await getApplyPolicy();

    const result = await applyPolicy(
      directive,
      {},
      {},
      {
        reply: { request },
        user: request.user,
      },
    );

    expect(result).toMatchObject({
      extensions: {
        claimValidationErrors: [
          { reason: { expectedToInclude: "posts:delete" } },
        ],
      },
      statusCode: 403,
    });
  });

  it("returns a 401 without a user, never checking", async () => {
    const request = { hasPermission: vi.fn() };
    const applyPolicy = await getApplyPolicy();

    const result = await applyPolicy(
      directive,
      {},
      {},
      {
        reply: { request },
      },
    );

    expect(result).toMatchObject({ statusCode: 401 });
    expect(request.hasPermission).not.toHaveBeenCalled();
  });
});
