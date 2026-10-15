import fastifyConfig from "@prefabs.tech/eslint-config/fastify.js";

export default [
  ...fastifyConfig,
  {
    rules: {
      "unicorn/filename-case": [
        "error",
        {
          cases: {
            kebabCase: true,
            camelCase: true,
            snakeCase: true,
          },
        },
      ],
    },
  },
  {
    files: ["**/__test__/**"],
    rules: {
      "unicorn/filename-case": "off",
    },
  },
];
