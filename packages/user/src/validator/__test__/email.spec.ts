import { beforeEach, describe, expect, it } from "vitest";

import validateEmail from "../email";

import type { ApiConfig } from "@prefabs.tech/fastify-config";

describe("validateEmail", () => {
  let config = {} as unknown as ApiConfig;

  beforeEach(() => {
    config = {
      user: {
        email: {},
      },
    } as unknown as ApiConfig;
  });

  it("returns error object when email is undefined", async () => {
    const email = undefined as unknown as string;

    const emailValidation = validateEmail(email, config);

    expect(emailValidation).toEqual({
      message: "Email is required",
      success: false,
    });
  });

  it("returns error object when email is invalid", async () => {
    const email = "user";

    const emailValidation = validateEmail(email, config);

    expect(emailValidation).toEqual({
      message: "Email is invalid",
      success: false,
    });
  });

  it("returns success object when email is valid", async () => {
    const email = "user@example.com";

    const emailValidation = validateEmail(email, config);

    expect(emailValidation).toEqual({ success: true });
  });

  it("returns error object when email domain not present in hostWhitelist", async () => {
    config.user.email.host_whitelist = ["example.com"];

    const email = "user@notexamplenot.com";

    const emailValidation = validateEmail(email, config);

    expect(emailValidation).toEqual({
      message: "Email is invalid",
      success: false,
    });
  });

  it("returns success object when email domain present in hostWhitelist", async () => {
    config.user.email.host_whitelist = ["example.com"];

    const email = "user@example.com";

    const emailValidation = validateEmail(email, config);

    expect(emailValidation).toEqual({
      success: true,
    });
  });
});
