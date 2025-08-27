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
        fileName: "prefabs-tech-fastify-graphql",
        formats: ["cjs", "es"],
        name: "PrefabsTechFastifyGraphql",
      },
      rollupOptions: {
        external: [
          ...Object.keys(dependencies),
          ...Object.keys(peerDependencies),
        ],
        output: {
          exports: "named",
          globals: {
            "@prefabs.tech/fastify-config": "PrefabsTechFastifyConfig",
            "@prefabs.tech/fastify-slonik": "PrefabsTechFastifySlonik",
            "@graphql-tools/merge": "GraphqlToolsMerge",
            fastify: "Fastify",
            "fastify-plugin": "FastifyPlugin",
            graphql: "Graphql",
            "graphql-tag": "GraphqlTag",
            mercurius: "Mercurius",
            slonik: "Slonik",
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
