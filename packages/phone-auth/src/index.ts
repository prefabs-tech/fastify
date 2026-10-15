import type { PhoneAuthConfig } from "./types";

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

export * from "./constants";

export { default as getTwilioClient } from "./lib/getTwilioClient";
export { default } from "./plugin";
export { default as getPasswordlessRecipeConfig } from "./recipe/config";
export { default as consumeCode } from "./recipe/consumeCode";
export { default as consumeCodePOST } from "./recipe/consumeCodePost";
export { default as initPasswordlessRecipe } from "./recipe/initPasswordlessRecipe";

export type * from "./types";
