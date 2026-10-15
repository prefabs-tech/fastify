import type { FastifyInstance } from "fastify";

import {
  graphqlUploadTransport,
  UPLOAD_TRANSPORT_PLUGIN_NAME,
} from "@prefabs.tech/fastify-graphql";
import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import multipartParserPlugin from "../plugins/deprecatedMultipartParser";

describe("multipartParserPlugin (deprecated compat wrapper)", () => {
  let fastify: FastifyInstance;

  afterEach(async () => fastify.close());

  it("registers the graphql upload transport and logs a deprecation warning", async () => {
    fastify = Fastify({ logger: false });
    const warnSpy = vi.spyOn(fastify.log, "warn");

    await fastify.register(multipartParserPlugin);
    await fastify.ready();

    expect(fastify.hasPlugin(UPLOAD_TRANSPORT_PLUGIN_NAME)).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("deprecated"));
  });

  it("does not register a second transport when one is already present", async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(graphqlUploadTransport);

    await expect(
      fastify.register(multipartParserPlugin).ready(),
    ).resolves.toBeDefined();
  });
});
