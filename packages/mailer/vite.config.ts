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
        fileName: "prefabs-tech-fastify-mailer",
        formats: ["cjs", "es"],
        name: "PrefabsTechFastifyMailer",
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
            fastify: "Fastify",
            "fastify-plugin": "FastifyPlugin",
            "html-to-text": "HtmlToText",
            mjml: "Mjml",
            mustache: "Mustache",
            nodemailer: "Nodemailer",
            "nodemailer-html-to-text": "NodemailerHtmlToText",
            "nodemailer-mjml": "NodemailerMml",
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
