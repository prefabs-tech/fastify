import { gql } from "@prefabs.tech/fastify-graphql";

const role = gql`
  type Role {
    role: String!
    permissions: [String]!
  }

  type UpdateRolePermissionsResponse {
    status: String!
    permissions: [String]!
  }

  type RoleResponse {
    status: String!
  }

  type Mutation {
    createRole(role: String!, permissions: [String]): RoleResponse! @auth
    deleteRole(role: String!): RoleResponse! @auth
    updateRolePermissions(
      role: String!
      permissions: [String]!
    ): UpdateRolePermissionsResponse! @auth
  }

  type Query {
    permissions: [String]! @auth
    roles: [Role]! @auth
    rolePermissions(role: String!): [String]! @auth
  }
`;
export default role;
