import { applyFilter } from "@prefabs.tech/fastify-slonik";
import humps from "humps";
import { sql } from "slonik";

import type {
  BaseFilterInput,
  FilterInput,
} from "@prefabs.tech/fastify-slonik";
import type { IdentifierSqlToken, FragmentSqlToken } from "slonik";

const applyFiltersToQuery = (
  filters: FilterInput,
  tableIdentifier: IdentifierSqlToken,
  not = false,
): FragmentSqlToken => {
  const andFilter: FragmentSqlToken[] = [];
  const orFilter: FragmentSqlToken[] = [];
  let queryFilter;

  const applyFilters = (
    filters: FilterInput,
    tableIdentifier: IdentifierSqlToken,
    not = false,
  ) => {
    if ("AND" in filters) {
      for (const filterData of filters.AND) {
        applyFilters(filterData, tableIdentifier);
      }
    } else if ("OR" in filters) {
      for (const filterData of filters.OR) {
        applyFilters(filterData, tableIdentifier, true);
      }
    } else {
      const query =
        humps.decamelize(filters.key) === "roles"
          ? applyRolesFilter(filters)
          : applyFilter(tableIdentifier, filters);

      if (not) {
        orFilter.push(query);
      } else {
        andFilter.push(query);
      }
    }
  };

  applyFilters(filters, tableIdentifier, not);

  if (andFilter.length > 0 && orFilter.length > 0) {
    queryFilter = sql.join(
      [
        sql.fragment`(${sql.join(andFilter, sql.fragment` AND `)})`,
        sql.fragment`(${sql.join(orFilter, sql.fragment` OR `)})`,
      ],
      sql.fragment`${
        "AND" in filters ? sql.fragment` AND ` : sql.fragment` OR `
      }`,
    );
  } else if (andFilter.length > 0) {
    queryFilter = sql.join(andFilter, sql.fragment` AND `);
  } else if (orFilter.length > 0) {
    queryFilter = sql.join(orFilter, sql.fragment` OR `);
  }

  return queryFilter ? sql.fragment`WHERE ${queryFilter}` : sql.fragment``;
};

const applyRolesFilter = (filter: BaseFilterInput) => {
  const { value } = filter;
  const not = filter.not || false;

  const notFragment = not ? sql.fragment`NOT` : sql.fragment``;

  const valueFragment = sql.fragment`(${sql.join(
    value.split(","),
    sql.fragment`, `,
  )})`;

  return sql.fragment`${notFragment} EXISTS (
      SELECT roles
      FROM jsonb_array_elements_text(user_role.role) as roles
      WHERE roles IN ${valueFragment}
    )`;
};

export { applyFiltersToQuery };
