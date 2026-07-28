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
        fileName: "prefabs-tech-fastify-passwordless",
        formats: ["cjs", "es"],
        name: "PrefabsTechFastifyPasswordless",
      },
      rolldownOptions: {
        external: [
          ...Object.keys(dependencies),
          ...Object.keys(peerDependencies),
          /supertokens-node+/,
        ],
        output: {
          exports: "named",
          globals: {
            "@prefabs.tech/fastify-config": "PrefabsTechFastifyConfig",
            "@prefabs.tech/fastify-error-handler":
              "PrefabsTechFastifyErrorHandler",
            "@prefabs.tech/fastify-slonik": "PrefabsTechFastifySlonik",
            "@prefabs.tech/fastify-user": "PrefabsTechFastifyUser",
            fastify: "Fastify",
            "fastify-plugin": "FastifyPlugin",
            slonik: "Slonik",
            "supertokens-node": "SupertokensNode",
            "supertokens-node/recipe/passwordless": "SupertokensPasswordless",
            "supertokens-node/recipe/userroles": "SupertokensUserRoles",
            twilio: "Twilio",
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
