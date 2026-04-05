import validator from "validator";
import { z } from "zod";

import type { PasswordErrorMessages, StrongPasswordOptions } from "../types";

const defaultOptions = {
  minLength: 8,
  minLowercase: 0,
  minNumbers: 0,
  minSymbols: 0,
  minUppercase: 0,
  pointsForContainingLower: 10,
  pointsForContainingNumber: 10,
  pointsForContainingSymbol: 10,
  pointsForContainingUpper: 10,
  pointsPerRepeat: 0.5,
  pointsPerUnique: 1,
  returnScore: false,
};

const schema = (
  errorMessages: PasswordErrorMessages,
  options: StrongPasswordOptions | undefined,
) => {
  const _options = {
    ...defaultOptions,
    ...options,
  };

  return z
    .string({
      required_error: errorMessages.required,
    })
    .refine(
      (value): boolean => {
        return validator.isStrongPassword(
          value,
          _options as {
            returnScore: false | undefined;
          } & StrongPasswordOptions,
        );
      },
      {
        message: errorMessages.weak,
      },
    );
};

export default schema;

export { defaultOptions };
