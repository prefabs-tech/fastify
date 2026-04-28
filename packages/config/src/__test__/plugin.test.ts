/* istanbul ignore file */
import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { ApiConfig } from "../types";

import configPlugin from "../plugin";

const baseConfig: ApiConfig = {
  appName: "TestApp",
  appOrigin: ["http://localhost:3000"],
  baseUrl: "http://localhost",
  env: "test",
  logger: { level: "silent" },
  name: "test-api",
  port: 3000,
  protocol: "http",
  rest: { enabled: true },
  version: "1.0.0+test",
};

describe("configPlugin — registration", () => {
  it("registers without throwing given a valid config", async () => {
    const fastify = Fastify({ logger: false });
    await expect(
      fastify.register(configPlugin, { config: baseConfig }),
    ).resolves.not.toThrow();
    await fastify.close();
  });

  it("fails registration when config option is not provided", async () => {
    const fastify = Fastify({ logger: false });

    await expect(
      fastify.register(
        configPlugin,
        {} as unknown as {
          config: ApiConfig;
        },
      ),
    ).rejects.toThrow();

    await fastify.close();
  });
});

describe("configPlugin — fastify.config decorator", () => {
  let fastify: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(configPlugin, { config: baseConfig });
    await fastify.ready();
  });

  afterEach(async () => {
    await fastify.close();
  });

  it("exposes the exact config object on fastify.config", () => {
    expect(fastify.config).toBe(baseConfig);
  });

  it("exposes correct appName", () => {
    expect(fastify.config.appName).toBe("TestApp");
  });

  it("exposes correct port", () => {
    expect(fastify.config.port).toBe(3000);
  });

  it("exposes correct env", () => {
    expect(fastify.config.env).toBe("test");
  });

  it("exposes correct version", () => {
    expect(fastify.config.version).toBe("1.0.0+test");
  });

  it("exposes correct appOrigin array", () => {
    expect(fastify.config.appOrigin).toEqual(["http://localhost:3000"]);
  });

  it("exposes correct rest.enabled flag", () => {
    expect(fastify.config.rest.enabled).toBe(true);
  });

  it("optional apps field is undefined when not provided", () => {
    expect(fastify.config.apps).toBeUndefined();
  });

  it("optional pagination field is undefined when not provided", () => {
    expect(fastify.config.pagination).toBeUndefined();
  });
});

describe("configPlugin — fastify.hostname decorator", () => {
  it("computes hostname as baseUrl:port", async () => {
    const fastify = Fastify({ logger: false });
    await fastify.register(configPlugin, { config: baseConfig });
    await fastify.ready();

    expect(fastify.hostname).toBe("http://localhost:3000");
    await fastify.close();
  });

  it("reflects different baseUrl and port values", async () => {
    const fastify = Fastify({ logger: false });
    const config: ApiConfig = {
      ...baseConfig,
      baseUrl: "https://api.example.com",
      port: 8080,
    };
    await fastify.register(configPlugin, { config });
    await fastify.ready();

    expect(fastify.hostname).toBe("https://api.example.com:8080");
    await fastify.close();
  });
});

describe("configPlugin — req.config request decorator", () => {
  let fastify: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    fastify = Fastify({ logger: false });
    await fastify.register(configPlugin, { config: baseConfig });
  });

  afterEach(async () => {
    await fastify.close();
  });

  it("populates req.config in a GET route handler", async () => {
    fastify.get("/test", async (req) => {
      return { appName: req.config.appName };
    });

    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ appName: "TestApp" });
  });

  it("populates req.config in a POST route handler", async () => {
    fastify.post("/test", async (req) => {
      return { version: req.config.version };
    });

    const res = await fastify.inject({ method: "POST", url: "/test" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ version: "1.0.0+test" });
  });

  it("req.config is the same object as fastify.config", async () => {
    let requestConfig: ApiConfig | undefined;

    fastify.get("/test", async (req) => {
      requestConfig = req.config;
      return {};
    });

    await fastify.inject({ method: "GET", url: "/test" });
    expect(requestConfig).toBe(baseConfig);
  });

  it("req.config is available on every request", async () => {
    fastify.get("/test", async (req) => {
      return { env: req.config.env };
    });

    const [res1, res2] = await Promise.all([
      fastify.inject({ method: "GET", url: "/test" }),
      fastify.inject({ method: "GET", url: "/test" }),
    ]);

    expect(res1.json()).toEqual({ env: "test" });
    expect(res2.json()).toEqual({ env: "test" });
  });

  it("config values are stable across multiple requests (no mutation)", async () => {
    fastify.get("/test", async (req) => {
      return { port: req.config.port };
    });

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        fastify.inject({ method: "GET", url: "/test" }),
      ),
    );

    for (const res of results) {
      expect(res.json()).toEqual({ port: 3000 });
    }
  });
});

describe("configPlugin — app-wide visibility (fastify-plugin)", () => {
  it("exposes fastify.config, fastify.hostname, and req.config inside a nested child plugin", async () => {
    const fastify = Fastify({ logger: false });
    await fastify.register(configPlugin, { config: baseConfig });

    await fastify.register(async function nestedChildPlugin(child) {
      child.get("/nested", async (request) => {
        return {
          hostname: child.hostname,
          instanceHasConfig: "config" in child,
          instanceHasHostname: "hostname" in child,
          requestAppName: request.config.appName,
        };
      });
    });

    await fastify.ready();
    const res = await fastify.inject({ method: "GET", url: "/nested" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      hostname: "http://localhost:3000",
      instanceHasConfig: true,
      instanceHasHostname: true,
      requestAppName: "TestApp",
    });
    await fastify.close();
  });
});

describe("configPlugin — optional config fields", () => {
  it("exposes apps array when provided", async () => {
    const fastify = Fastify({ logger: false });
    const config: ApiConfig = {
      ...baseConfig,
      apps: [
        {
          id: 1,
          name: "WebApp",
          origin: "https://web.example.com",
          supportedRoles: ["admin", "user"],
        },
      ],
    };
    await fastify.register(configPlugin, { config });

    fastify.get("/test", async (req) => {
      return { apps: req.config.apps };
    });

    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.json().apps).toHaveLength(1);
    expect(res.json().apps[0].name).toBe("WebApp");
    await fastify.close();
  });

  it("exposes pagination defaults when provided", async () => {
    const fastify = Fastify({ logger: false });
    const config: ApiConfig = {
      ...baseConfig,
      pagination: { default_limit: 20, max_limit: 100 },
    };
    await fastify.register(configPlugin, { config });
    await fastify.ready();

    expect(fastify.config.pagination?.default_limit).toBe(20);
    expect(fastify.config.pagination?.max_limit).toBe(100);
    await fastify.close();
  });

  it("exposes apps array via req.config inside a route", async () => {
    const fastify = Fastify({ logger: false });
    const config: ApiConfig = {
      ...baseConfig,
      apps: [
        {
          id: 2,
          name: "MobileApp",
          origin: "https://mobile.example.com",
          supportedRoles: ["user"],
        },
      ],
    };
    await fastify.register(configPlugin, { config });

    fastify.get("/test", async (req) => {
      return { firstApp: req.config.apps?.[0]?.name };
    });

    const res = await fastify.inject({ method: "GET", url: "/test" });
    expect(res.json()).toEqual({ firstApp: "MobileApp" });
    await fastify.close();
  });
});
