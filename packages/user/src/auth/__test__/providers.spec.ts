import { describe, expect, it } from "vitest";

import type { AuthProvider } from "../adapter";

import {
  getAuthProvider,
  registerAuthProvider,
  supertokensProvider,
} from "../providers";

describe("auth providers registry", () => {
  it("returns the built-in supertokens provider", () => {
    expect(getAuthProvider("supertokens")).toBe(supertokensProvider);
  });

  it("throws for unknown provider names", () => {
    expect(() => getAuthProvider("unknown-provider")).toThrow(
      "Unknown auth provider: unknown-provider",
    );
  });

  it("allows registering a custom provider", () => {
    const custom: AuthProvider = {
      adapter: supertokensProvider.adapter,
    };

    registerAuthProvider("custom-test", custom);

    expect(getAuthProvider("custom-test")).toBe(custom);
  });
});
