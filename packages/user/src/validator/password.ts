import { passwordSchema } from "../schemas";
import { defaultOptions } from "../schemas/password";

import type { StrongPasswordOptions } from "../types";
import type { ApiConfig } from "@prefabs.tech/fastify-config";

const getErrorMessage = (options?: StrongPasswordOptions): string => {
  let errorMessage = "Password is too weak";

  if (!options) {
    return errorMessage;
  }

  const messages: string[] = [];

  if (options.minLength) {
    const length = options.minLength;

    messages.push(
      `minimum ${length} ${length > 1 ? "characters" : "character"}`,
    );
  }

  if (options.minLowercase) {
    const length = options.minLowercase;

    messages.push(
      `minimum ${length} ${length > 1 ? "lowercases" : "lowercase"}`,
    );
  }

  if (options.minUppercase) {
    const length = options.minUppercase;

    messages.push(
      `minimum ${length} ${length > 1 ? "uppercases" : "uppercase"}`,
    );
  }

  if (options.minNumbers) {
    const length = options.minNumbers;

    messages.push(`minimum ${length} ${length > 1 ? "numbers" : "number"}`);
  }

  if (options.minSymbols) {
    const length = options.minSymbols;

    messages.push(`minimum ${length} ${length > 1 ? "symbols" : "symbol"}`);
  }

  if (messages.length > 0) {
    errorMessage = "Password should contain ";

    const lastMessage = messages.pop();

    if (messages.length > 0) {
      errorMessage += messages.join(", ") + " and ";
    }

    errorMessage += lastMessage;
  }

  return errorMessage;
};

const validatePassword = (password: string, config: ApiConfig) => {
  const strongPasswordOptions = config.user.password;

  const result = passwordSchema(
    {
      required: "Password is required",
      weak: getErrorMessage({ ...defaultOptions, ...strongPasswordOptions }),
    },
    strongPasswordOptions,
  ).safeParse(password);

  if (!result.success) {
    return {
      message: result.error.issues[0].message,
      success: false,
    };
  }

  return { success: true };
};

export default validatePassword;
