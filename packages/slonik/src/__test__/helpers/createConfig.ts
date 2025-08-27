/* istanbul ignore file */
import type { SlonikOptions } from "../../types";
import type { ApiConfig } from "@prefabs.tech/fastify-config";

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
    version: "0.1",
    slonik: {
      db: {
        databaseName: "test",
        host: "localhost",
        password: "password",
        username: "username",
      },
      ...slonikOptions,
    },
  };

  return config;
};

export default createConfig;
