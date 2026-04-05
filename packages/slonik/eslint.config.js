import fastifyConfig from "@prefabs.tech/eslint-config/fastify.js";
import perfectionist from "eslint-plugin-perfectionist";

export default [
  ...fastifyConfig,
  {
    plugins: {
      perfectionist,
    },
    rules: {
      // Disable conflicting default/import rules
      "sort-imports": "off",
      "import/order": "off",

      // Enable and spread Perfectionist's recommended rules
      ...perfectionist.configs["recommended-alphabetical"].rules,

      // Add any Fastify-specific rule overrides here
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
];
