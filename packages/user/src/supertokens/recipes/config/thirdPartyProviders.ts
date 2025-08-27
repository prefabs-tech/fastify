import ThirdPartyEmailPassword from "supertokens-node/recipe/thirdpartyemailpassword";

import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { TypeProvider } from "supertokens-node/recipe/thirdpartyemailpassword";

const getThirdPartyProviders = (config: ApiConfig) => {
  const { Apple, Facebook, Github, Google } = ThirdPartyEmailPassword;
  const providersConfig = config.user.supertokens.providers;
  const providers: TypeProvider[] = [];

  const providerFunctions = [
    { name: "google", initProvider: Google },
    { name: "github", initProvider: Github },
    { name: "facebook", initProvider: Facebook },
    { name: "apple", initProvider: Apple },
  ];

  for (const provider of providerFunctions) {
    if (providersConfig?.[provider.name as never]) {
      if (provider.name === "apple") {
        const appleProviderConfigs = providersConfig[provider.name];

        if (appleProviderConfigs) {
          for (const appleProviderConfig of appleProviderConfigs) {
            providers.push(provider.initProvider(appleProviderConfig as never));
          }
        }
      } else {
        providers.push(
          provider.initProvider(
            providersConfig[provider.name as never] as never,
          ),
        );
      }
    }
  }

  const customProviders = providersConfig?.custom;

  if (customProviders) {
    for (const customerProvider of customProviders) {
      providers.push(customerProvider);
    }
  }

  return providers;
};

export default getThirdPartyProviders;
