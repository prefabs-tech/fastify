import type { FastifyInstance, FastifyRequest } from "fastify";

import Fastify from "fastify";
import FastifyPlugin from "fastify-plugin";
import { afterEach, describe, expect, it, vi } from "vitest";

import authenticateRoute from "../authenticateRoute";

// Stands in for SuperTokens' verifySession: a bearer token is the session.
const verifyToken = async (request: FastifyRequest) => {
  const token = request.headers.authorization;

  if (!token) {
    throw Object.assign(new Error("unauthorised"), { statusCode: 401 });
  }

  request.user = { id: token } as never;
};

const fakeVerifySession = () => vi.fn(() => verifyToken);

const buildFastify = () => {
  const fastify = Fastify({ logger: false });
  const verifySession = fakeVerifySession();

  fastify.decorate("verifySession", verifySession as never);

  return { fastify, verifySession };
};

const handler = async (request: FastifyRequest) => ({
  user: request.user?.id ?? "anonymous",
});

describe("authenticateRoute", () => {
  let fastify: FastifyInstance;

  afterEach(async () => {
    await fastify.close();
  });

  it("refuses a private route without a session, before its handler", async () => {
    const built = buildFastify();
    fastify = built.fastify;
    const routeHandler = vi.fn(handler);
    fastify.addHook("onRequest", authenticateRoute);
    fastify.get("/private", routeHandler);

    const response = await fastify.inject({ url: "/private" });

    expect(response.statusCode).toBe(401);
    expect(routeHandler).not.toHaveBeenCalled();
  });

  it("runs a private route with a session, with request.user set", async () => {
    const built = buildFastify();
    fastify = built.fastify;
    fastify.addHook("onRequest", authenticateRoute);
    fastify.get("/private", handler);

    const response = await fastify.inject({
      headers: { authorization: "user-1" },
      url: "/private",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ user: "user-1" });
  });

  it("runs a public route with or without a session, reading none", async () => {
    const built = buildFastify();
    fastify = built.fastify;
    fastify.addHook("onRequest", authenticateRoute);
    fastify.get("/open", { config: { public: true } }, handler);

    const anonymous = await fastify.inject({ url: "/open" });
    const signedIn = await fastify.inject({
      headers: { authorization: "user-1" },
      url: "/open",
    });

    expect(anonymous.statusCode).toBe(200);
    expect(signedIn.json()).toEqual({ user: "anonymous" });
    expect(built.verifySession).not.toHaveBeenCalled();
  });

  it("leaves a request that matches no route to the 404, as SuperTokens' /auth endpoints are", async () => {
    const built = buildFastify();
    fastify = built.fastify;
    fastify.addHook("onRequest", authenticateRoute);
    fastify.get("/private", handler);

    const unknown = await fastify.inject({ url: "/typo" });
    const auth = await fastify.inject({ method: "POST", url: "/auth/signin" });

    expect(unknown.statusCode).toBe(404);
    expect(auth.statusCode).toBe(404);
    expect(built.verifySession).not.toHaveBeenCalled();
  });

  it("checks HEAD on a private GET route as it checks GET", async () => {
    const built = buildFastify();
    fastify = built.fastify;
    fastify.addHook("onRequest", authenticateRoute);
    fastify.get("/private", handler);

    const anonymous = await fastify.inject({ method: "HEAD", url: "/private" });
    const signedIn = await fastify.inject({
      headers: { authorization: "user-1" },
      method: "HEAD",
      url: "/private",
    });

    expect(anonymous.statusCode).toBe(401);
    expect(signedIn.statusCode).toBe(200);
  });

  it("guards only the routes of the router it is added to by hand", async () => {
    const built = buildFastify();
    fastify = built.fastify;
    await fastify.register(async (router) => {
      router.addHook("onRequest", authenticateRoute);
      router.get("/guarded", handler);
    });
    fastify.get("/unguarded", handler);

    const guarded = await fastify.inject({ url: "/guarded" });
    const unguarded = await fastify.inject({ url: "/unguarded" });

    expect(guarded.statusCode).toBe(401);
    expect(unguarded.statusCode).toBe(200);
  });

  it("lets an app mark routes it doesn't own public, from onRoute, before their plugins register", async () => {
    const built = buildFastify();
    fastify = built.fastify;
    const publicPaths = ["/graphql", "/documentation"];
    fastify.addHook("onRoute", (route) => {
      if (
        publicPaths.some(
          (path) => route.url === path || route.url.startsWith(`${path}/`),
        )
      ) {
        route.config = { ...route.config, public: true };
      }
    });
    fastify.addHook("onRequest", authenticateRoute);
    // Registered the way the graphql (fastify-plugin) and swagger (prefixed) plugins register
    await fastify.register(
      FastifyPlugin(async (instance) => {
        instance.post("/graphql", async () => ({ data: {} }));
      }),
    );
    await fastify.register(
      async (instance) => {
        instance.get("/json", async () => ({}));
      },
      { prefix: "/documentation" },
    );
    fastify.get("/private", handler);

    const graphql = await fastify.inject({ method: "POST", url: "/graphql" });
    const documentation = await fastify.inject({ url: "/documentation/json" });
    const unmarked = await fastify.inject({ url: "/private" });

    expect(graphql.statusCode).toBe(200);
    expect(documentation.statusCode).toBe(200);
    expect(unmarked.statusCode).toBe(401);
  });
});
