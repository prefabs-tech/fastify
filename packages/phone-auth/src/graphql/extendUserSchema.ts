import type { FastifyInstance } from "fastify";

const USER_SCHEMA_EXTENSION = `
  extend type User {
    phoneNumber: String
  }
`;

const extendUserSchema = async (fastify: FastifyInstance) => {
  // fastify.graphql exists only once mercurius is registered, and the extension
  // needs the User type that @prefabs.tech/fastify-user contributes. Extending
  // a type that is not defined throws, so an app running without GraphQL — or
  // without the user schema merged — must be left alone.
  if (!fastify.graphql?.schema?.getType("User")) {
    return;
  }

  await fastify.graphql.extendSchema(USER_SCHEMA_EXTENSION);
};

export default extendUserSchema;
