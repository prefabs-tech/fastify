import type { SessionContainer } from "supertokens-node/recipe/session";

import type { AuthSession } from "./adapter";

/**
 * Cast an adapter `AuthSession` to the raw SuperTokens session container.
 *
 * @deprecated Prefer `auth.claims` / `AuthSession` for application code. Use only
 * when you still need SuperTokens session APIs (`assertClaims`, `fetchAndSetClaim`,
 * …) during migration. Will be removed in a future release.
 */
const getSupertokensSession = (session: AuthSession): SessionContainer =>
  session as unknown as SessionContainer;

export { getSupertokensSession };
