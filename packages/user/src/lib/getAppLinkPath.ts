import type { AppConfig } from "@prefabs.tech/fastify-config";

import type { AppLinkPaths } from "../types/config.js";

const getAppLinkPath = (
  app: AppConfig | undefined,
  link: keyof AppLinkPaths,
): string | undefined => {
  const path = app?.paths?.[link];

  if (!path) {
    return undefined;
  }

  return path.startsWith("/") ? path : `/${path}`;
};

export default getAppLinkPath;
