import type { PasswordlessConfig } from "./types";

declare module "@prefabs.tech/fastify-config" {
  interface ApiConfig {
    passwordless?: PasswordlessConfig;
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
