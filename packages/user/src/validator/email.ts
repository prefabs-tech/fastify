import { emailSchema } from "../schemas";

import type { ApiConfig } from "@prefabs.tech/fastify-config";

const validateEmail = (email: string, config: ApiConfig) => {
  const result = emailSchema(
    {
      invalid: "Email is invalid",
      required: "Email is required",
    },
    config.user.email,
  ).safeParse(email);

  if (!result.success) {
    return {
      message: result.error.issues[0].message,
      success: false,
    };
  }

  return { success: true };
};

export default validateEmail;
