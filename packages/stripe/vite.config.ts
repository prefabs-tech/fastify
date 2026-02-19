import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, loadEnv } from "vite";

import { dependencies, peerDependencies } from "./package.json";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

  return {
    build: {
      lib: {
        entry: resolve(dirname(fileURLToPath(import.meta.url)), "src/index.ts"),
        fileName: "prefabs-tech-fastify-stripe",
        formats: ["cjs", "es"],
        name: "PrefabsTechFastifyStripe",
      },
      rollupOptions: {
        external: [
          ...Object.keys(dependencies),
          ...Object.keys(peerDependencies),
        ],
        output: {
          exports: "named",
          globals: {
            "@prefabs.tech/fastify-error-handler":
              "PrefabsTechFastifyErrorHandler",
            "@prefabs.tech/fastify-slonik": "PrefabsTechFastifySlonik",
            "@prefabs.tech/fastify-graphql": "PrefabsTechFastifyGraphql",
            fastify: "Fastify",
            "fastify-plugin": "FastifyPlugin",
            stripe: "Stripe",
            mercurius: "mercurius",
            slonik: "Slonik",
            zod: "zod",
          },
        },
      },
      target: "es2022",
    },
    resolve: {
      alias: {
        "@/": new URL("src/", import.meta.url).pathname,
      },
    },
    test: {
      coverage: {
        provider: "istanbul",
        reporter: ["text", "json", "html"],
      },
    },
  };
});
