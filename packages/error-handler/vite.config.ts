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
        fileName: "prefabs-tech-fastify-error-handler",
        name: "PrefabsTechFastifyErrorHandler",
      },
      rollupOptions: {
        external: [
          ...Object.keys(dependencies),
          ...Object.keys(peerDependencies),
          "node:http",
        ],
        output: {
          exports: "named",
          globals: {
            "@fastify/sensible": "FastifySensible",
            fastify: "Fastify",
            "fastify-plugin": "FastifyPlugin",
            "node:http": "NodeHttp",
            stacktracey: "StackTracey",
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
