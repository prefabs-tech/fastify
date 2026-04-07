import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { FastifyInstance } from "fastify";

/* istanbul ignore file */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted ensures these are available inside the vi.mock factory
const { mockApps, mockCert, mockInitializeApp } = vi.hoisted(() => ({
  mockApps: [] as unknown[],
  mockCert: vi.fn().mockReturnValue({ type: "service_account" }),
  mockInitializeApp: vi.fn(),
}));

vi.mock("firebase-admin", () => ({
  default: {
    get apps() {
      return mockApps;
    },
    credential: {
      cert: mockCert,
    },
    initializeApp: mockInitializeApp,
  },
}));

const baseCredentials = {
  clientEmail: "test@test.iam.gserviceaccount.com",
  privateKey: String.raw`-----BEGIN PRIVATE KEY-----\nKEY_DATA\nMORE_DATA\n-----END PRIVATE KEY-----`,
  projectId: "test-project",
};

const makeConfig = (overrides: object = {}): ApiConfig =>
  ({
    firebase: {
      credentials: baseCredentials,
      enabled: true,
      ...overrides,
    },
  }) as unknown as ApiConfig;

const makeFastify = () =>
  ({
    log: {
      error: vi.fn(),
      info: vi.fn(),
    },
  }) as unknown as FastifyInstance;

describe("initializeFirebase", async () => {
  const { default: initializeFirebase } =
    await import("../lib/initializeFirebase");

  beforeEach(() => {
    vi.clearAllMocks();
    mockApps.length = 0;
  });

  afterEach(() => {
    mockApps.length = 0;
  });

  it("skips initialization when admin.apps is already populated", async () => {
    mockApps.push({});
    const fastify = makeFastify();
    const config = makeConfig();

    initializeFirebase(config, fastify);

    expect(mockInitializeApp).not.toHaveBeenCalled();
  });

  it("logs an error when enabled is not false but credentials are missing", () => {
    const fastify = makeFastify();
    const config = makeConfig({ credentials: undefined });

    initializeFirebase(config, fastify);

    expect(fastify.log.error).toHaveBeenCalledWith(
      "Firebase credentials are missing",
    );
    expect(mockInitializeApp).not.toHaveBeenCalled();
  });

  it(
    String.raw`replaces literal \\n escape sequences in privateKey with real newlines`,
    () => {
      const fastify = makeFastify();
      const config = makeConfig();

      initializeFirebase(config, fastify);

      expect(mockCert).toHaveBeenCalledWith(
        expect.objectContaining({
          privateKey: expect.stringContaining("\n"),
        }),
      );
      const passedKey: string = mockCert.mock.calls[0][0].privateKey;
      expect(passedKey).not.toContain(String.raw`\n`);
    },
  );

  it("passes projectId and clientEmail unchanged to admin.credential.cert", () => {
    const fastify = makeFastify();
    const config = makeConfig();

    initializeFirebase(config, fastify);

    expect(mockCert).toHaveBeenCalledWith(
      expect.objectContaining({
        clientEmail: baseCredentials.clientEmail,
        projectId: baseCredentials.projectId,
      }),
    );
  });

  it("logs error and continues when admin.initializeApp throws", () => {
    const error = new Error("initializeApp failed");
    mockInitializeApp.mockImplementationOnce(() => {
      throw error;
    });
    const fastify = makeFastify();
    const config = makeConfig();

    expect(() => initializeFirebase(config, fastify)).not.toThrow();
    expect(fastify.log.error).toHaveBeenCalledWith(
      "Failed to initialize firebase",
    );
    expect(fastify.log.error).toHaveBeenCalledWith(error);
  });
});
