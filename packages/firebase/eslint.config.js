import fastifyConfig from "@prefabs.tech/eslint-config/fastify.js";

export default [
  ...fastifyConfig,
  {
    rules: {
      "n/no-missing-import": "off",
    },
  },
];
