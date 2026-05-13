import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type { MercuriusContext } from "mercurius";

/* istanbul ignore file */
import type { GraphqlEnabledPlugin } from "../../types";

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
    graphql: {
      enabled: true,
      graphiql: false,
      path: "/graphql",
      plugins,
      resolvers,
      schema,
    },
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
    },
    version: "0.1",
  };

  return config;
};

export default createConfig;
