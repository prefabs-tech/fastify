/* istanbul ignore file */
import type { GraphqlEnabledPlugin } from "../../types";
import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { MercuriusContext } from "mercurius";

const schema = `
  type Query {
    test: Response
  }

  type Response {
    propertyOne: String
    propertyTwo: String
  }
`;

const resolvers = {
  Query: {
    test: async (_: unknown, __: unknown, context: MercuriusContext) => ({
      propertyOne: context.propertyOne,
      propertyTwo: context.propertyTwo,
    }),
  },
};

const createConfig = (plugins: GraphqlEnabledPlugin[]) => {
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
    graphql: {
      enabled: true,
      graphiql: false,
      path: "/graphql",
      schema,
      resolvers,
      plugins,
    },
    slonik: {
      db: {
        databaseName: "test",
        host: "localhost",
        password: "password",
        username: "username",
      },
    },
  };

  return config;
};

export default createConfig;
