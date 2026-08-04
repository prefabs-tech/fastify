import fastifyConfig from "@prefabs.tech/eslint-config/fastify.js";

export default [
  ...fastifyConfig,
  {
    files: ["**/__test__/**"],
    rules: {
      "unicorn/filename-case": "off",
      "unicorn/no-this-outside-of-class": "off",
    },
  },
];
