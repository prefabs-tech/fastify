import validateEmail from "../../../../validator/email";
import validatePassword from "../../../../validator/password";

import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { TypeInputFormField } from "supertokens-node/lib/build/recipe/emailpassword/types";

const getDefaultFormFields = (config: ApiConfig): TypeInputFormField[] => {
  return [
    {
      id: "email",
      validate: async (email) => {
        const result = validateEmail(email, config);

        if (!result.success) {
          return result.message;
        }
      },
    },
    {
      id: "password",
      validate: async (password) => {
        const result = validatePassword(password, config);

        if (!result.success) {
          return result.message;
        }
      },
    },
  ];
};

const getFormFields = (config: ApiConfig): TypeInputFormField[] => {
  let formFields: TypeInputFormField[] = [];

  if (
    typeof config.user.supertokens?.recipes?.thirdPartyEmailPassword ===
    "object"
  ) {
    const fields =
      config.user.supertokens?.recipes?.thirdPartyEmailPassword.signUpFeature
        ?.formFields;

    if (fields) {
      formFields = [...fields];
    }
  }

  const formFieldIds = new Set(formFields.map((formField) => formField.id));

  for (const defaultFormField of getDefaultFormFields(config)) {
    if (!formFieldIds.has(defaultFormField.id)) {
      formFields.push(defaultFormField);
    }
  }

  return formFields;
};

export default getFormFields;
