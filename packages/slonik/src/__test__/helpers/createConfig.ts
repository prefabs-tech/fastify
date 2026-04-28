import type { ApiConfig } from "@prefabs.tech/fastify-config";

/* istanbul ignore file */
import type { SlonikOptions } from "../../types";

const createConfig = (slonikOptions?: SlonikOptions) => {
  const config: ApiConfig = {
    appName: "app",
    appOrigin: ["http://localhost"],
    baseUrl: "http://localhost",
    env: "development",
    logger: {
      level: "debug",
    },
    name: "Test",
    port: 3000,
    protocol: "http",
    rest: {
      enabled: true,
    },
    slonik: {
      db: {
        databaseName: "test",
        host: "localhost",
        password: "password",
        username: "username",
      },
      ...slonikOptions,
    },
    version: "0.1",
  };

  return config;
};

export default createConfig;
