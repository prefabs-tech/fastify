import humps from "humps";
import { sql } from "slonik";

import { applyFiltersToQuery } from "./dbFilters";

import type { FilterInput, SortInput } from "@prefabs.tech/fastify-slonik";
import type { FragmentSqlToken, IdentifierSqlToken } from "slonik";

const createRoleSortFragment = (
  identifier: IdentifierSqlToken,
  sort?: SortInput[],
): FragmentSqlToken => {
  let direction = sql.fragment`ASC`;

  if (!Array.isArray(sort)) {
    sort = [];
  }

  sort.some((sortItem) => {
    if (sortItem.key === "roles" && sortItem.direction != "ASC") {
      direction = sql.fragment`DESC`;

      return true;
    }

    return false;
  });

  return sql.fragment`ORDER BY ${identifier} ${direction}`;
};

const createUserFilterFragment = (
  filters: FilterInput | undefined,
  tableIdentifier: IdentifierSqlToken,
) => {
  if (filters) {
    return applyFiltersToQuery(filters, tableIdentifier);
  }

  return sql.fragment``;
};

const createUserSortFragment = (
  tableIdentifier: IdentifierSqlToken,
  sort?: SortInput[],
): FragmentSqlToken => {
  if (sort && sort.length > 0) {
    const arraySort = [];

    for (const data of sort) {
      const direction =
        data.direction === "ASC" ? sql.fragment`ASC` : sql.fragment`DESC`;

      let roleFragment;

      if (data.key === "roles") {
        roleFragment = sql.fragment`user_role.role ->> 0`;
      }

      const sortIdentifier = sql.identifier([
        ...tableIdentifier.names,
        humps.decamelize(data.key),
      ]);

      arraySort.push(
        sql.fragment`${roleFragment ?? sortIdentifier} ${direction}`,
      );
    }

    return sql.fragment`ORDER BY ${sql.join(arraySort, sql.fragment`,`)}`;
  }

  return sql.fragment``;
};

export {
  createRoleSortFragment,
  createUserFilterFragment,
  createUserSortFragment,
};
