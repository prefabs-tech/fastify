import type { FastifyInstance } from "fastify";

import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

import "../index";
import createMailerConfig from "./helpers/createMailerConfig";

const { createTransportMock, useMock } = vi.hoisted(() => {
  const useMock = vi.fn();
  const sendMailMock = vi.fn().mockResolvedValue({ response: "250 OK" });
  const createTransportMock = vi.fn().mockReturnValue({
    sendMail: sendMailMock,
    use: useMock,
  });
  return { createTransportMock, useMock };
});

vi.mock("nodemailer", () => ({
  createTransport: createTransportMock,
}));

vi.mock("nodemailer-mjml", () => ({
  nodemailerMjmlPlugin: vi.fn(),
}));

vi.mock("nodemailer-html-to-text", () => ({
  htmlToText: vi.fn(),
}));

describe("mailerPlugin — registration", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    fastify = Fastify({ logger: false });
  });

  it("registers without throwing", async () => {
    await expect(
      fastify.register(plugin, createMailerConfig()),
    ).resolves.not.toThrow();
  });

  it("decorates fastify with mailer after registration", async () => {
    await fastify.register(plugin, createMailerConfig());
    await fastify.ready();
    expect(fastify.mailer).toBeDefined();
  });

  it("fastify.mailer exposes sendMail", async () => {
    await fastify.register(plugin, createMailerConfig());
    await fastify.ready();
    expect(typeof fastify.mailer.sendMail).toBe("function");
  });

  it("calls createTransport with transport and defaults", async () => {
    const { defaults, transport } = createMailerConfig();
    await fastify.register(plugin, createMailerConfig());
    expect(createTransportMock).toHaveBeenCalledWith(transport, defaults);
  });

  it("registers MJML compile hook with configured templateFolder", async () => {
    const { nodemailerMjmlPlugin } = await import("nodemailer-mjml");
    const { templating } = createMailerConfig();
    await fastify.register(plugin, createMailerConfig());
    expect(nodemailerMjmlPlugin).toHaveBeenCalledWith({
      templateFolder: templating.templateFolder,
    });
    expect(useMock).toHaveBeenCalledWith(
      "compile",
      (nodemailerMjmlPlugin as ReturnType<typeof vi.fn>)(),
    );
  });

  it("registers html-to-text compile hook", async () => {
    const { htmlToText } = await import("nodemailer-html-to-text");
    await fastify.register(plugin, createMailerConfig());
    expect(useMock).toHaveBeenCalledWith(
      "compile",
      (htmlToText as ReturnType<typeof vi.fn>)(),
    );
  });

  it("throws when registered twice on the same instance", async () => {
    await fastify.register(plugin, createMailerConfig());
    await expect(
      fastify.register(plugin, createMailerConfig()),
    ).rejects.toThrow("fastify-mailer has already been registered");
  });
});

describe("mailerPlugin — legacy config fallback", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    fastify = Fastify({ logger: false });
  });

  it("reads options from fastify.config.mailer when no options passed to register()", async () => {
    const config = createMailerConfig();
    fastify.decorate("config", { mailer: config });

    await fastify.register(plugin);
    await fastify.ready();

    expect(createTransportMock).toHaveBeenCalledWith(
      config.transport,
      config.defaults,
    );
  });

  it("fastify.mailer is available after legacy registration", async () => {
    fastify.decorate("config", { mailer: createMailerConfig() });
    await fastify.register(plugin);
    await fastify.ready();
    expect(fastify.mailer).toBeDefined();
  });

  it("throws a descriptive error when no options and no fastify.config.mailer", async () => {
    await expect(fastify.register(plugin)).rejects.toThrow(
      "Missing mailer configuration. Did you forget to pass it to the mailer plugin?",
    );
  });
});
