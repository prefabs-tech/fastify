import type { FastifyInstance } from "fastify";

import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { UPLOAD_TRANSPORT_PLUGIN_NAME } from "../constants";
import graphqlPlugin from "../plugin";
import transport from "../uploads/transport";

const schema = `
  type Query {
    ping: String
  }
`;

const resolvers = {
  Query: {
    ping: async () => "pong",
  },
};

const BOUNDARY = "----upload-test-boundary";

/** Minimal graphql-multipart-request-spec body (operations, map, one file). */
const buildGraphqlUploadBody = (): Buffer => {
  const operations = JSON.stringify({
    query: "mutation ($file: Upload!) { noop }",
    variables: { file: null }, // eslint-disable-line unicorn/no-null
  });
  const map = JSON.stringify({ 0: ["variables.file"] });

  return Buffer.from(
    `--${BOUNDARY}\r\n` +
      `Content-Disposition: form-data; name="operations"\r\n\r\n` +
      `${operations}\r\n` +
      `--${BOUNDARY}\r\n` +
      `Content-Disposition: form-data; name="map"\r\n\r\n` +
      `${map}\r\n` +
      `--${BOUNDARY}\r\n` +
      `Content-Disposition: form-data; name="0"; filename="note.txt"\r\n` +
      `Content-Type: text/plain\r\n\r\n` +
      `hello-upload\r\n` +
      `--${BOUNDARY}--\r\n`,
    "utf8",
  );
};

/** Plain multipart body with one field and one file. */
const buildPlainMultipartBody = (): Buffer =>
  Buffer.from(
    `--${BOUNDARY}\r\n` +
      `Content-Disposition: form-data; name="description"\r\n\r\n` +
      `a plain field\r\n` +
      `--${BOUNDARY}\r\n` +
      `Content-Disposition: form-data; name="doc"; filename="doc.bin"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n` +
      `binary-ish\r\n` +
      `--${BOUNDARY}--\r\n`,
    "utf8",
  );

describe("graphqlUploadTransport — content-type parsing", () => {
  let fastify: FastifyInstance;

  afterEach(async () => fastify.close());

  it("processes multipart requests to the default /graphql path into an upload body", async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(transport);

    let capturedBody: Record<string, unknown> | undefined;
    fastify.post("/graphql", async (req) => {
      capturedBody = req.body as Record<string, unknown>;
      return {};
    });

    await fastify.ready();

    const response = await fastify.inject({
      headers: {
        "content-type": `multipart/form-data; boundary=${BOUNDARY}`,
      },
      method: "POST",
      payload: buildGraphqlUploadBody(),
      url: "/graphql",
    });

    expect(response.statusCode).toBe(200);
    expect(capturedBody?.query).toContain("mutation");

    const variables = capturedBody?.variables as { file: unknown };
    expect(variables.file).toBeTruthy();
  });

  it("honors a custom graphql path", async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(transport, { path: "/api/gql" });

    let flagged: boolean | undefined;
    fastify.post("/api/gql", async (req) => {
      flagged = req.graphqlFileUploadMultipart;
      return {};
    });

    await fastify.ready();

    await fastify.inject({
      headers: {
        "content-type": `multipart/form-data; boundary=${BOUNDARY}`,
      },
      method: "POST",
      payload: buildGraphqlUploadBody(),
      url: "/api/gql",
    });

    expect(flagged).toBe(true);
  });

  it("parses multipart requests outside the graphql path with busboy", async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(transport);

    let capturedBody: Record<string, unknown> | undefined;
    fastify.post("/upload", async (req) => {
      capturedBody = req.body as Record<string, unknown>;
      return {};
    });

    await fastify.ready();

    const response = await fastify.inject({
      headers: {
        "content-type": `multipart/form-data; boundary=${BOUNDARY}`,
      },
      method: "POST",
      payload: buildPlainMultipartBody(),
      url: "/upload",
    });

    expect(response.statusCode).toBe(200);
    expect(capturedBody?.description).toBe("a plain field");
    expect(capturedBody?.doc).toEqual([
      expect.objectContaining({
        data: Buffer.from("binary-ish"),
        filename: "doc.bin",
        mimetype: "application/octet-stream",
      }),
    ]);
  });

  it("does not return 415 for unknown content types", async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(transport);

    fastify.post("/test", async () => ({}));
    await fastify.ready();

    const response = await fastify.inject({
      headers: { "content-type": "text/csv" },
      method: "POST",
      payload: "a,b,c",
      url: "/test",
    });

    expect(response.statusCode).not.toBe(415);
  });
});

describe("graphqlPlugin — upload transport registration", () => {
  let fastify: FastifyInstance;

  afterEach(async () => fastify.close());

  it("registers the upload transport by default when graphql is enabled", async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(graphqlPlugin, { enabled: true, resolvers, schema });
    await fastify.ready();

    expect(fastify.hasPlugin(UPLOAD_TRANSPORT_PLUGIN_NAME)).toBe(true);
  });

  it("does not register the upload transport when uploads.enabled is false", async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(graphqlPlugin, {
      enabled: true,
      resolvers,
      schema,
      uploads: { enabled: false },
    });
    await fastify.ready();

    expect(fastify.hasPlugin(UPLOAD_TRANSPORT_PLUGIN_NAME)).toBe(false);
  });

  it("does not register the upload transport when graphql is disabled", async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(graphqlPlugin, {
      enabled: false,
      resolvers,
      schema,
    });
    await fastify.ready();

    expect(fastify.hasPlugin(UPLOAD_TRANSPORT_PLUGIN_NAME)).toBe(false);
  });

  it("skips its own transport registration when the transport is already registered", async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(transport);
    await fastify.register(graphqlPlugin, { enabled: true, resolvers, schema });

    await expect(fastify.ready()).resolves.toBeDefined();
    expect(fastify.hasPlugin(UPLOAD_TRANSPORT_PLUGIN_NAME)).toBe(true);
  });
});
