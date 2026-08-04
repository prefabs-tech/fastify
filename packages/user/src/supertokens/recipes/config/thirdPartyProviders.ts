import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { ProviderClientConfig } from "supertokens-node/lib/build/recipe/thirdparty/types";
import type { TypeProvider } from "supertokens-node/recipe/thirdpartyemailpassword";

import {
  Apple,
  Facebook,
  Github,
  Google,
} from "supertokens-node/lib/build/recipe/thirdparty/providers";

interface AppleSingleProviderConfig {
  clientId: string;
  clientSecret: {
    keyId: string;
    privateKey: string;
    teamId: string;
  };
  isDefault?: boolean;
}

interface NonAppleProviderConfig {
  clientId: string;
  clientSecret: string;
}

const getThirdPartyProviders = (config: ApiConfig) => {
  const providersConfig = config.user.supertokens!.providers;
  const providers: TypeProvider[] = [];

  const providerFunctions = [
    { initProvider: Google, name: "google" as const },
    { initProvider: Github, name: "github" as const },
    { initProvider: Facebook, name: "facebook" as const },
    { initProvider: Apple, name: "apple" as const },
  ];

  for (const provider of providerFunctions) {
    if (provider.name === "apple") {
      const appleProviderConfigs = providersConfig?.apple as
        AppleSingleProviderConfig[] | undefined;

      if (appleProviderConfigs && appleProviderConfigs.length > 0) {
        const clients: (ProviderClientConfig & { isDefault?: boolean })[] =
          Array.from(appleProviderConfigs, (config_) => ({
            additionalConfig: { ...config_.clientSecret },
            clientId: config_.clientId,
            isDefault: config_.isDefault,
          }));

        providers.push(
          Apple({
            config: {
              clients,
              thirdPartyId: "apple",
            },
          }),
        );
      }
    } else if (
      provider.name === "google" ||
      provider.name === "github" ||
      provider.name === "facebook"
    ) {
      const config_ = providersConfig?.[provider.name] as
        NonAppleProviderConfig | undefined;

      if (config_ && config_.clientId) {
        providers.push(
          provider.initProvider({
            config: {
              clients: [
                {
                  clientId: config_.clientId,
                  clientSecret: config_.clientSecret,
                },
              ],
              thirdPartyId: provider.name,
            },
          }),
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
