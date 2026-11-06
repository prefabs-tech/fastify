import type { PhoneAuthConfig } from "./types.js";

declare module "@prefabs.tech/fastify-config" {
  interface ApiConfig {
    phoneAuth?: PhoneAuthConfig;
  }
}

declare module "@prefabs.tech/fastify-user" {
  interface User {
    phoneNumber?: string;
  }
}

export * from "./constants.js";

export { default as getTwilioClient } from "./lib/getTwilioClient.js";
export { default } from "./plugin.js";
export { default as getPasswordlessRecipeConfig } from "./recipe/config.js";
export { default as consumeCode } from "./recipe/consumeCode.js";
export { default as consumeCodePOST } from "./recipe/consumeCodePost.js";
export { default as initPasswordlessRecipe } from "./recipe/initPasswordlessRecipe.js";

export type * from "./types.js";
