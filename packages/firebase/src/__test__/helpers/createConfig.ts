/* istanbul ignore file */
import type { ApiConfig } from "@prefabs.tech/fastify-config";

const createConfig = (
  firebaseOverrides: Record<string, unknown> = {},
): ApiConfig =>
  ({
    appName: "app",
    appOrigin: ["http://localhost"],
    baseUrl: "http://localhost",
    env: "development",
    firebase: {
      enabled: true,
      ...firebaseOverrides,
    },
    logger: { level: "debug" },
    name: "Test",
    port: 3000,
    protocol: "http",
    rest: { enabled: true },
    slonik: {
      db: {
        databaseName: "test",
        host: "localhost",
        password: "password",
        username: "username",
      },
    },
    version: "0.1",
  }) as unknown as ApiConfig;

export default createConfig;
