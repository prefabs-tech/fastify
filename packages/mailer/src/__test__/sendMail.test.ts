import type { FastifyInstance } from "fastify";

import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "../index";
import createMailerConfig from "./helpers/createMailerConfig";

const { createTransportMock, sendMailMock } = vi.hoisted(() => {
  const useMock = vi.fn();
  const sendMailMock = vi.fn().mockResolvedValue({ response: "250 OK" });
  const createTransportMock = vi.fn().mockReturnValue({
    sendMail: sendMailMock,
    use: useMock,
  });
  return { createTransportMock, sendMailMock };
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

describe("mailerPlugin — sendMail › template data", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    fastify = Fastify({ logger: false });
  });

  afterEach(async () => {
    await fastify.close();
  });

  it("passes empty templateData when neither global nor per-email is set", async () => {
    const config = createMailerConfig();
    delete (config as { templateData?: unknown }).templateData;

    await fastify.register(plugin, config);
    await fastify.ready();

    await fastify.mailer.sendMail({
      html: "<p>Hi</p>",
      subject: "Test",
      to: "user@example.com",
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({ templateData: {} }),
    );
  });

  it("passes global templateData when no per-email templateData given", async () => {
    const globalData = { appName: "MyApp", year: 2025 };
    await fastify.register(plugin, {
      ...createMailerConfig(),
      templateData: globalData,
    });
    await fastify.ready();

    await fastify.mailer.sendMail({
      html: "<p>Hi</p>",
      subject: "Test",
      to: "user@example.com",
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({ templateData: globalData }),
    );
  });

  it("passes per-email templateData when no global templateData configured", async () => {
    const config = createMailerConfig();
    delete (config as { templateData?: unknown }).templateData;

    await fastify.register(plugin, config);
    await fastify.ready();

    const perEmailData = { orderId: "ORD-001", total: "$9.99" };
    await fastify.mailer.sendMail({
      html: "<p>Confirmed</p>",
      subject: "Order",
      templateData: perEmailData,
      to: "user@example.com",
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({ templateData: perEmailData }),
    );
  });

  it("merges global and per-email templateData into a single object", async () => {
    await fastify.register(plugin, {
      ...createMailerConfig(),
      templateData: { appName: "MyApp", supportEmail: "help@myapp.com" },
    });
    await fastify.ready();

    await fastify.mailer.sendMail({
      html: "<p>Hi</p>",
      subject: "Test",
      templateData: { orderId: "ORD-123" },
      to: "user@example.com",
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        templateData: {
          appName: "MyApp",
          orderId: "ORD-123",
          supportEmail: "help@myapp.com",
        },
      }),
    );
  });

  it("per-email templateData overrides global on key conflict", async () => {
    await fastify.register(plugin, {
      ...createMailerConfig(),
      templateData: { appName: "MyApp", env: "production" },
    });
    await fastify.ready();

    await fastify.mailer.sendMail({
      html: "<p>Hi</p>",
      subject: "Test",
      templateData: { env: "staging" },
      to: "user@example.com",
    });

    const calledWith = sendMailMock.mock.calls[0][0];
    expect(calledWith.templateData.env).toBe("staging");
    expect(calledWith.templateData.appName).toBe("MyApp");
  });

  it("resolves with the transporter sendMail result when using the promise API", async () => {
    const sentInfo = { messageId: "<msg@test>", response: "250 OK" };
    sendMailMock.mockResolvedValueOnce(sentInfo);

    await fastify.register(plugin, createMailerConfig());
    await fastify.ready();

    const result = await fastify.mailer.sendMail({
      html: "<p>Hi</p>",
      subject: "Test",
      to: "user@example.com",
    });

    expect(result).toEqual(sentInfo);
  });

  it("global templateData is not mutated by per-email overrides", async () => {
    const globalData = { env: "production" };
    await fastify.register(plugin, {
      ...createMailerConfig(),
      templateData: globalData,
    });
    await fastify.ready();

    await fastify.mailer.sendMail({
      html: "<p>1</p>",
      subject: "1",
      templateData: { env: "staging" },
      to: "a@example.com",
    });

    await fastify.mailer.sendMail({
      html: "<p>2</p>",
      subject: "2",
      to: "b@example.com",
    });

    const secondCall = sendMailMock.mock.calls[1][0];
    expect(secondCall.templateData.env).toBe("production");
  });
});

describe("mailerPlugin — sendMail › callback", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    fastify = Fastify({ logger: false });
    await fastify.register(plugin, createMailerConfig());
    await fastify.ready();
  });

  afterEach(async () => {
    await fastify.close();
  });

  it("invokes callback on success", async () => {
    const callback = vi.fn();

    await fastify.mailer.sendMail(
      { html: "<p>Hi</p>", subject: "Hi", to: "user@example.com" },
      callback,
    );

    expect(sendMailMock).toHaveBeenCalledWith(expect.any(Object), callback);
  });
});
