import type { FastifyInstance, FastifyRequest } from "fastify";

import { describe, expect, it, vi } from "vitest";

import type { AccessControlAdmin } from "../../types";

import giveProviderRoles from "../giveProviderRoles";

const request = { id: "request-1" } as unknown as FastifyRequest;

const roleMap = {
  ADMIN: ["user-admin"],
  SUPERADMIN: ["superadmin", "user-admin"],
  USER: [],
};

const makeAdmin = (current: string[] = []) => ({
  getUserRoles: vi.fn().mockResolvedValue(current),
  setUserRoles: vi.fn(
    async (_request: FastifyRequest, _userId: string, roles: string[]) => roles,
  ),
});

const makeFastify = (accessControl?: Record<string, unknown>) =>
  ({
    config: { user: { accessControl } },
    log: { error: vi.fn(), warn: vi.fn() },
  }) as unknown as FastifyInstance;

const asAdmin = (admin: ReturnType<typeof makeAdmin>) =>
  admin as unknown as AccessControlAdmin;

describe("giveProviderRoles", () => {
  it("does nothing without roleMap", async () => {
    const admin = makeAdmin();

    await giveProviderRoles(
      makeFastify({ admin: asAdmin(admin) }),
      request,
      "user-1",
      ["ADMIN"],
    );

    expect(admin.getUserRoles).not.toHaveBeenCalled();
    expect(admin.setUserRoles).not.toHaveBeenCalled();
  });

  it("does nothing without config.user.accessControl", async () => {
    await expect(
      giveProviderRoles(makeFastify(), request, "user-1", ["ADMIN"]),
    ).resolves.toBeUndefined();
  });

  it("gives the mapped roles through admin, with the request", async () => {
    const admin = makeAdmin();

    await giveProviderRoles(
      makeFastify({ admin: asAdmin(admin), roleMap }),
      request,
      "user-1",
      ["ADMIN"],
    );

    expect(admin.getUserRoles).toHaveBeenCalledWith(request, "user-1");
    expect(admin.setUserRoles).toHaveBeenCalledWith(request, "user-1", [
      "user-admin",
    ]);
  });

  it("keeps the roles the user holds and gives each role once", async () => {
    const admin = makeAdmin(["reporting-admin", "user-admin"]);

    await giveProviderRoles(
      makeFastify({ admin: asAdmin(admin), roleMap }),
      request,
      "user-1",
      ["ADMIN", "SUPERADMIN", "ADMIN"],
    );

    expect(admin.setUserRoles).toHaveBeenCalledOnce();
    expect(admin.setUserRoles).toHaveBeenCalledWith(request, "user-1", [
      "reporting-admin",
      "user-admin",
      "superadmin",
    ]);
  });

  it("gives nothing for roles the map leaves out or maps to none", async () => {
    const admin = makeAdmin();

    await giveProviderRoles(
      makeFastify({ admin: asAdmin(admin), roleMap }),
      request,
      "user-1",
      ["USER", "EDITOR"],
    );

    expect(admin.getUserRoles).not.toHaveBeenCalled();
    expect(admin.setUserRoles).not.toHaveBeenCalled();
  });

  it("maps roles named like Object.prototype keys to nothing", async () => {
    const admin = makeAdmin();

    await giveProviderRoles(
      makeFastify({ admin: asAdmin(admin), roleMap: {} }),
      request,
      "user-1",
      ["constructor", "toString", "__proto__", "hasOwnProperty"],
    );

    expect(admin.getUserRoles).not.toHaveBeenCalled();
  });

  it("writes nothing when the user holds every mapped role already", async () => {
    const admin = makeAdmin(["superadmin", "user-admin"]);

    await giveProviderRoles(
      makeFastify({ admin: asAdmin(admin), roleMap }),
      request,
      "user-1",
      ["SUPERADMIN"],
    );

    expect(admin.getUserRoles).toHaveBeenCalledOnce();
    expect(admin.setUserRoles).not.toHaveBeenCalled();
  });

  it("warns and gives nothing without a request", async () => {
    const admin = makeAdmin();
    const fastify = makeFastify({ admin: asAdmin(admin), roleMap });

    await giveProviderRoles(fastify, undefined, "user-1", ["ADMIN"]);

    expect(admin.getUserRoles).not.toHaveBeenCalled();
    expect(fastify.log.warn).toHaveBeenCalledWith(
      { roles: ["user-admin"], userId: "user-1" },
      expect.any(String),
    );
  });

  it.each([
    ["reading", "getUserRoles"],
    ["saving", "setUserRoles"],
  ] as const)(
    "logs the error, never throwing, when %s the roles fails",
    async (_step, method) => {
      const admin = makeAdmin();
      const error = new Error("database down");
      admin[method].mockRejectedValue(error);
      const fastify = makeFastify({ admin: asAdmin(admin), roleMap });

      await expect(
        giveProviderRoles(fastify, request, "user-1", ["ADMIN"]),
      ).resolves.toBeUndefined();

      expect(fastify.log.error).toHaveBeenCalledWith(
        { err: error, roles: ["user-admin"], userId: "user-1" },
        expect.any(String),
      );
    },
  );
});
