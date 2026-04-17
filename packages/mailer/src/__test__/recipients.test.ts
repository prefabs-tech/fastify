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

const baseMailOptions = {
  bcc: "bcc@example.com",
  cc: "cc@example.com",
  html: "<p>Hi</p>",
  subject: "Test",
  to: "user@example.com",
};

describe("mailerPlugin — recipient override", async () => {
  const { default: plugin } = await import("../plugin");

  let fastify: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when recipients is not configured", () => {
    beforeEach(async () => {
      fastify = Fastify({ logger: false });
      const config = createMailerConfig();
      delete (config as { recipients?: unknown }).recipients;
      await fastify.register(plugin, config);
      await fastify.ready();
    });

    afterEach(async () => {
      await fastify.close();
    });

    it("passes the original to through unchanged", async () => {
      await fastify.mailer.sendMail(baseMailOptions);
      const calledWith = sendMailMock.mock.calls[0][0];
      expect(calledWith.to).toBe("user@example.com");
    });

    it("passes the original cc through unchanged", async () => {
      await fastify.mailer.sendMail(baseMailOptions);
      const calledWith = sendMailMock.mock.calls[0][0];
      expect(calledWith.cc).toBe("cc@example.com");
    });

    it("passes the original bcc through unchanged", async () => {
      await fastify.mailer.sendMail(baseMailOptions);
      const calledWith = sendMailMock.mock.calls[0][0];
      expect(calledWith.bcc).toBe("bcc@example.com");
    });
  });

  describe("when recipients is an empty array", () => {
    beforeEach(async () => {
      fastify = Fastify({ logger: false });
      await fastify.register(plugin, {
        ...createMailerConfig(),
        recipients: [],
      });
      await fastify.ready();
    });

    afterEach(async () => {
      await fastify.close();
    });

    it("does not override to", async () => {
      await fastify.mailer.sendMail(baseMailOptions);
      const calledWith = sendMailMock.mock.calls[0][0];
      expect(calledWith.to).toBe("user@example.com");
    });

    it("does not clear cc", async () => {
      await fastify.mailer.sendMail(baseMailOptions);
      const calledWith = sendMailMock.mock.calls[0][0];
      expect(calledWith.cc).toBe("cc@example.com");
    });
  });

  describe("when recipients array is configured", () => {
    const recipients = ["qa@myapp.com", "staging@myapp.com"];

    beforeEach(async () => {
      fastify = Fastify({ logger: false });
      await fastify.register(plugin, {
        ...createMailerConfig(),
        recipients,
      });
      await fastify.ready();
    });

    afterEach(async () => {
      await fastify.close();
    });

    it("overrides to with the recipients array", async () => {
      await fastify.mailer.sendMail(baseMailOptions);
      const calledWith = sendMailMock.mock.calls[0][0];
      expect(calledWith.to).toEqual(recipients);
    });

    it("sets cc to undefined", async () => {
      await fastify.mailer.sendMail(baseMailOptions);
      const calledWith = sendMailMock.mock.calls[0][0];
      expect(calledWith.cc).toBeUndefined();
    });

    it("sets bcc to undefined", async () => {
      await fastify.mailer.sendMail(baseMailOptions);
      const calledWith = sendMailMock.mock.calls[0][0];
      expect(calledWith.bcc).toBeUndefined();
    });

    it("still delivers to recipients even when to was different", async () => {
      await fastify.mailer.sendMail({
        ...baseMailOptions,
        to: "real-customer@example.com",
      });
      const calledWith = sendMailMock.mock.calls[0][0];
      expect(calledWith.to).toEqual(recipients);
      expect(calledWith.to).not.toContain("real-customer@example.com");
    });
  });
});
