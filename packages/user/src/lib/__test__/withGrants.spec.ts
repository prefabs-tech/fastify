import type { FastifyInstance } from "fastify";

import { describe, expect, it, vi } from "vitest";

import type { User } from "../../types";

import withGrants from "../withGrants";

const user: User = {
  disabled: false,
  email: "user@example.com",
  id: "user-1",
  lastLoginAt: 0,
  signedUpAt: 0,
};

const makeFastify = (getGrants?: unknown) =>
  ({ config: { user: { getGrants } } }) as unknown as FastifyInstance;

describe("withGrants", () => {
  it("returns the user unchanged when getGrants is not configured", async () => {
    const result = await withGrants(user, makeFastify());

    expect(result).toBe(user);
    expect(result).not.toHaveProperty("grants");
  });

  it("adds what getGrants returns, called with the user and fastify", async () => {
    const grants = [{ permission: "report.view" }];
    const getGrants = vi.fn().mockResolvedValue(grants);
    const fastify = makeFastify(getGrants);

    const result = await withGrants(user, fastify);

    expect(result).toEqual({ ...user, grants });
    expect(getGrants).toHaveBeenCalledWith(user, fastify);
  });

  it("does not change the user it was given", async () => {
    const getGrants = vi.fn().mockResolvedValue([]);

    await withGrants(user, makeFastify(getGrants));

    expect(user).not.toHaveProperty("grants");
  });

  it("rejects when getGrants throws, rather than returning the user without grants", async () => {
    const getGrants = vi.fn().mockRejectedValue(new Error("database down"));

    await expect(withGrants(user, makeFastify(getGrants))).rejects.toThrow(
      "database down",
    );
  });
});
