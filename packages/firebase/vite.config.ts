import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

import { dependencies, peerDependencies } from "./package.json";

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
        fileName: "prefabs-tech-fastify-firebase",
        formats: ["cjs", "es"],
        name: "PrefabsTechFastifyFirebase",
      },
      rolldownOptions: {
        external: [
          ...Object.keys(dependencies),
          ...Object.keys(peerDependencies),
          // String externals match exact ids only; subpath imports
          // (firebase-admin/app-check) would otherwise be bundled.
          /^firebase-admin\//,
          /^supertokens-node\//,
        ],
        output: {
          exports: "named",
          globals: {
            "@prefabs.tech/fastify-error-handler":
              "PrefabsTechFastifyErrorHandler",
            "@prefabs.tech/fastify-graphql": "PrefabsTechFastifyGraphql",
            "@prefabs.tech/fastify-slonik": "PrefabsTechFastifySlonik",
            fastify: "Fastify",
            "fastify-plugin": "FastifyPlugin",
            "firebase-admin": "FirebaseAdmin",
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
