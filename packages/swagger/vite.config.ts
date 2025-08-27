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
        fileName: "prefabs-tech-fastify-swagger",
        formats: ["cjs", "es"],
        name: "PrefabsTechFastifySwagger",
      },
      rollupOptions: {
        external: Object.keys({
          ...dependencies,
          ...peerDependencies,
        }),
        output: {
          exports: "named",
          globals: {
            fastify: "Fastify",
            "fastify-plugin": "FastifyPlugin",
            "@fastify/swagger": "FastifySwagger",
            "@fastify/swagger-ui": "FastifySwaggerUI",
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
