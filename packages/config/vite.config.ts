import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

import { peerDependencies } from "./package.json";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

  return {
    build: {
      lib: {
        entry: path.resolve(
          path.dirname(fileURLToPath(import.meta.url)),
          "src/index.ts",
        ),
        fileName: "prefabs-tech-fastify-config",
        formats: ["cjs", "es"],
        name: "PrefabsTechFastifyConfig",
      },
      rolldownOptions: {
        external: Object.keys(peerDependencies),
        output: {
          exports: "named",
          globals: {
            fastify: "Fastify",
            "fastify-plugin": "FastifyPlugin",
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
