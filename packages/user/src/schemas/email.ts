import validator from "validator";
import { z } from "zod";

import type { EmailErrorMessages, IsEmailOptions } from "../types/index.js";

const schema = (
  errorMessages: EmailErrorMessages,
  options: IsEmailOptions | undefined,
) => {
  return z
    .string({
      required_error: errorMessages.required,
    })
    .refine((value) => validator.isEmail(value, options || {}), {
      message: errorMessages.invalid,
    });
};

export default schema;
