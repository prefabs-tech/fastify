import type { FastifyInstance } from "fastify";

import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("mailerPlugin — test route › conditional registration", async () => {
  const { default: plugin } = await import("../plugin");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not register a route when test option is omitted", async () => {
    const fastify = Fastify({ logger: false });
    const config = createMailerConfig();
    delete (config as { test?: unknown }).test;

    await fastify.register(plugin, config);
    await fastify.ready();

    const res = await fastify.inject({ method: "GET", url: "/test/email" });
    expect(res.statusCode).toBe(404);
  });

  it("does not register a route when test.enabled is false", async () => {
    const fastify = Fastify({ logger: false });
    await fastify.register(plugin, {
      ...createMailerConfig(),
      test: { enabled: false, path: "/test/email", to: "dev@example.com" },
    });
    await fastify.ready();

    const res = await fastify.inject({ method: "GET", url: "/test/email" });
    expect(res.statusCode).toBe(404);
  });

  it("registers a GET route at test.path when test.enabled is true", async () => {
    const fastify = Fastify({ logger: false });
    await fastify.register(plugin, {
      ...createMailerConfig(),
      test: { enabled: true, path: "/custom/test-mail", to: "dev@example.com" },
    });
    await fastify.ready();

    const res = await fastify.inject({
      method: "GET",
      url: "/custom/test-mail",
    });
    expect(res.statusCode).not.toBe(404);
  });
});

describe("mailerPlugin — test route › HTTP response", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;
  const testConfig = createMailerConfig();

  beforeEach(async () => {
    vi.clearAllMocks();
    fastify = Fastify({ logger: false });
    await fastify.register(plugin, testConfig);
    await fastify.ready();
  });

  it("GET test route returns status 200", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: testConfig.test.path,
    });
    expect(res.statusCode).toBe(200);
  });

  it("response body has status: ok", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: testConfig.test.path,
    });
    expect(res.json().status).toBe("ok");
  });

  it("response body has message: Email successfully sent", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: testConfig.test.path,
    });
    expect(res.json().message).toBe("Email successfully sent");
  });

  it("response body has an info object", async () => {
    const res = await fastify.inject({
      method: "GET",
      url: testConfig.test.path,
    });
    expect(res.json().info).toBeDefined();
    expect(typeof res.json().info).toBe("object");
  });

  it("sendMail is called with the configured test.to address", async () => {
    await fastify.inject({ method: "GET", url: testConfig.test.path });
    const calledWith = sendMailMock.mock.calls[0][0];
    expect(calledWith.to).toBe(testConfig.test.to);
  });

  it("sendMail is called with subject Test email", async () => {
    await fastify.inject({ method: "GET", url: testConfig.test.path });
    const calledWith = sendMailMock.mock.calls[0][0];
    expect(calledWith.subject).toBe("Test email");
  });

  it("sendMail is called with compiled HTML content", async () => {
    await fastify.inject({ method: "GET", url: testConfig.test.path });
    const calledWith = sendMailMock.mock.calls[0][0];
    expect(calledWith.html).toContain("<!doctype html>");
  });
});
