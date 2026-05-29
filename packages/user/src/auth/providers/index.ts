import type { AuthProvider } from "../adapter";

import { supertokensProvider } from "../supertokens";

const providers: Record<string, AuthProvider> = {
  supertokens: supertokensProvider,
};

export function getAuthProvider(name: string): AuthProvider {
  const provider = providers[name];

  if (!provider) {
    throw new Error(`Unknown auth provider: ${name}`);
  }

  return provider;
}

/** Register a custom auth provider (e.g. better-auth) before the user plugin loads. */
export function registerAuthProvider(
  name: string,
  provider: AuthProvider,
): void {
  providers[name] = provider;
}

export { supertokensProvider } from "../supertokens";
