import { DefaultSqlFactory } from "@prefabs.tech/fastify-slonik";
import humps from "humps";
import { FragmentSqlToken, QuerySqlToken, sql } from "slonik";
import { z } from "zod";

import {
  createRoleSortFragment,
  createUserFilterFragment,
  createUserSortFragment,
} from "./sql";
import { TABLE_USERS } from "../../constants";
import { ChangeEmailInput, UserUpdateInput } from "../../types";

import type { FilterInput, SortInput } from "@prefabs.tech/fastify-slonik";

class UserSqlFactory extends DefaultSqlFactory {
  static readonly TABLE = TABLE_USERS;

  protected _softDeleteEnabled: boolean = true;

  getCountSql(filters?: FilterInput): QuerySqlToken {
    const countSchema = z.object({
      count: z.number(),
    });

    return sql.type(countSchema)`
      SELECT COUNT(*)
      FROM ${this.tableFragment}
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(ur.role) AS role
        FROM "public"."st__user_roles" as ur
        WHERE ur.user_id = users.id
      ) AS user_role ON TRUE
      ${this.getWhereFragment({ filters })};
    `;
  }

  getFindByIdSql = (id: number | string): QuerySqlToken => {
    return sql.type(this.validationSchema)`
      SELECT
        ${this.tableFragment}.*,
        COALESCE(user_role.role, '[]') AS roles
      FROM ${this.tableFragment}
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(ur.role ${createRoleSortFragment(
          sql.identifier(["ur", "role"]),
        )}) AS role
        FROM "public"."st__user_roles" as ur
        WHERE ur.user_id = ${this.tableIdentifier}.id
      ) AS user_role ON TRUE
      ${this.getWhereFragment({ filterFragment: sql.fragment`id = ${id}` })};
    `;
  };

  getListSql(
    limit?: number,
    offset?: number,
    filters?: FilterInput,
    sort?: SortInput[],
  ): QuerySqlToken {
    return sql.type(this.validationSchema)`
      SELECT
        ${this.tableFragment}.*,
        COALESCE(user_role.role, '[]') AS roles
      FROM ${this.tableFragment}
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(ur.role ${createRoleSortFragment(
          sql.identifier(["ur", "role"]),
          sort,
        )}) AS role
        FROM "public"."st__user_roles" as ur
        WHERE ur.user_id = ${this.tableIdentifier}.id
      ) AS user_role ON TRUE
      ${this.getWhereFragment({ filters })}
      ${this.getSortFragment(sort)}
      ${this.getLimitFragment(limit, offset)};
    `;
  }

  getUpdateSql(
    id: number | string,
    data: UserUpdateInput | ChangeEmailInput,
  ): QuerySqlToken {
    const columns = [];

    for (const column in data) {
      const value = data[column as keyof typeof data];
      columns.push(
        sql.fragment`${sql.identifier([humps.decamelize(column)])} = ${value}`,
      );
    }

    return sql.type(this.validationSchema)`
      UPDATE ${this.tableFragment}
      SET ${sql.join(columns, sql.fragment`, `)}
      ${this.getWhereFragment({ filterFragment: sql.fragment`id = ${id}` })}
      RETURNING *, (
        SELECT COALESCE(user_role.role, '[]') AS roles
        FROM ${this.tableFragment}
        LEFT JOIN LATERAL (
          SELECT jsonb_agg(ur.role ${createRoleSortFragment(
            sql.identifier(["ur", "role"]),
          )}) AS role
          FROM "public"."st__user_roles" as ur
          WHERE ur.user_id = ${this.tableIdentifier}.id
        ) AS user_role ON TRUE
        ${this.getWhereFragment({ filterFragment: sql.fragment`id = ${id}` })}
      ) as roles;
    `;
  }

  get table() {
    return this.config.user?.tables?.users?.name || super.table;
  }

  protected getFilterFragment(filters?: FilterInput): FragmentSqlToken {
    return createUserFilterFragment(filters, this.tableIdentifier);
  }

  protected getSortFragment(sort?: SortInput[]): FragmentSqlToken {
    return createUserSortFragment(
      this.tableIdentifier,
      this.getSortInput(sort),
    );
  }
}

export default UserSqlFactory;
