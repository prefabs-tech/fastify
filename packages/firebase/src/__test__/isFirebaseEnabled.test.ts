import type { FastifyInstance } from "fastify";

/* istanbul ignore file */
import { describe, expect, it, vi } from "vitest";

import isFirebaseEnabled from "../middlewares/isFirebaseEnabled";

const makeFastify = (enabled?: boolean) =>
  ({
    config: {
      firebase: { enabled },
    },
    httpErrors: {
      notFound: vi.fn().mockReturnValue(new Error("Firebase is disabled")),
    },
  }) as unknown as FastifyInstance;

describe("isFirebaseEnabled", () => {
  it("throws notFound when config.firebase.enabled === false", async () => {
    const fastify = makeFastify(false);
    const hook = isFirebaseEnabled(fastify);

    await expect(hook()).rejects.toThrow("Firebase is disabled");
    expect(fastify.httpErrors.notFound).toHaveBeenCalledWith(
      "Firebase is disabled",
    );
  });

  it("resolves without throwing when config.firebase.enabled is undefined", async () => {
    const fastify = makeFastify();
    const hook = isFirebaseEnabled(fastify);

    await expect(hook()).resolves.toBeUndefined();
  });

  it("resolves without throwing when config.firebase.enabled === true", async () => {
    const fastify = makeFastify(true);
    const hook = isFirebaseEnabled(fastify);

    await expect(hook()).resolves.toBeUndefined();
  });
});
