import fastify from "fastify";
import { describe, expect, it, vi, beforeEach } from "vitest";

import createMailerConfig from "./helpers/createMailerConfig";

import type { FastifyInstance } from "fastify";

const nodemailerMjmlPluginMock = vi.fn();
const htmlToTextMock = vi.fn();
const useMock = vi.fn();
const sendMailMock = vi.fn().mockResolvedValue({ response: "250 OK" });
const createTransportMock = vi.fn().mockReturnValue({
  sendMail: sendMailMock,
  use: useMock,
});

vi.mock("nodemailer", () => ({
  createTransport: createTransportMock,
}));

vi.mock("nodemailer-mjml", () => ({
  nodemailerMjmlPlugin: nodemailerMjmlPluginMock,
}));

vi.mock("nodemailer-html-to-text", () => ({
  htmlToText: htmlToTextMock,
}));

describe("Mailer", async () => {
  let api: FastifyInstance;

  /* eslint-disable-next-line n/no-unsupported-features/es-syntax */
  const { default: plugin } = await import("../plugin");

  beforeEach(async () => {
    api = await fastify();

    api.decorate("config", { mailer: createMailerConfig() });
  });

  it("Create Mailer instance with ", async () => {
    const { transport, defaults, templating } = createMailerConfig();
    await api.register(plugin, createMailerConfig());

    expect(createTransportMock).toHaveBeenCalledWith(transport, defaults);

    expect(useMock).toHaveBeenCalledWith("compile", nodemailerMjmlPluginMock());

    expect(useMock).toHaveBeenCalledWith("compile", htmlToTextMock());

    expect(nodemailerMjmlPluginMock).toHaveBeenCalledWith({
      templateFolder: templating.templateFolder,
    });
  });

  it("Should throw error if mailer already registered to api", async () => {
    await api.register(plugin, createMailerConfig());

    await expect(
      api.register(plugin, createMailerConfig()),
    ).rejects.toThrowError("fastify-mailer has already been registered");
  });

  it("Should call SendMail method ", async () => {
    const {
      templateData,
      test: { path, to },
    } = createMailerConfig();

    await api.register(plugin, createMailerConfig());

    await api.inject({
      method: "GET",
      path: path,
    });

    expect(sendMailMock).toHaveBeenCalledWith({
      html: expect.stringContaining("<!doctype html>"),
      subject: "Test email",
      to: to,
      templateData: templateData,
    });
  });
});
