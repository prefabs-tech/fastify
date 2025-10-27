import humps from "humps";
import { sql } from "slonik";

import type { BaseFilterInput, FilterInput } from "./types";
import type { IdentifierSqlToken, FragmentSqlToken } from "slonik";

const applyFilter = (
  tableIdentifier: IdentifierSqlToken,
  filter: BaseFilterInput,
): FragmentSqlToken => {
  const keyParts = filter.key.split(".").map((key) => humps.decamelize(key));
  const operator = filter.operator || "eq";
  const not = filter.not || false;
  let value: FragmentSqlToken | string = filter.value;

  let clauseOperator: FragmentSqlToken;

  const fieldIdentifier =
    keyParts.length > 1
      ? sql.identifier([...keyParts])
      : sql.identifier([...tableIdentifier.names, ...keyParts]);

  if (operator === "eq" && ["null", "NULL"].includes(value)) {
    clauseOperator = not ? sql.fragment`IS NOT NULL` : sql.fragment`IS NULL`;

    return sql.fragment`${fieldIdentifier} ${clauseOperator}`;
  }

  switch (operator) {
    case "ct":
    case "sw":
    case "ew": {
      const valueString = {
        ct: `%${value}%`, // contains
        ew: `%${value}`, // ends with
        sw: `${value}%`, // starts with
      };

      value = valueString[operator];
      clauseOperator = not ? sql.fragment`NOT ILIKE` : sql.fragment`ILIKE`;
      break;
    }
    case "dwithin": {
      const [latitude, longitude, radius] = value.split(",");

      return sql.fragment`ST_DWithin(
        ${fieldIdentifier}::geography,
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
        ${radius}
      )`;
    }
    case "eq":
    default: {
      clauseOperator = not ? sql.fragment`!=` : sql.fragment`=`;
      break;
    }
    case "gt": {
      clauseOperator = not ? sql.fragment`<` : sql.fragment`>`;
      break;
    }
    case "gte": {
      clauseOperator = not ? sql.fragment`<` : sql.fragment`>=`;
      break;
    }
    case "lte": {
      clauseOperator = not ? sql.fragment`>` : sql.fragment`<=`;
      break;
    }
    case "lt": {
      clauseOperator = not ? sql.fragment`>` : sql.fragment`<`;
      break;
    }
    case "in": {
      clauseOperator = not ? sql.fragment`NOT IN` : sql.fragment`IN`;
      value = sql.fragment`(${sql.join(value.split(","), sql.fragment`, `)})`;
      break;
    }
    case "bt": {
      clauseOperator = not ? sql.fragment`NOT BETWEEN` : sql.fragment`BETWEEN`;
      value = sql.fragment`${sql.join(value.split(","), sql.fragment` AND `)}`;
      break;
    }
  }

  return sql.fragment`${fieldIdentifier} ${clauseOperator} ${value}`;
};

const applyFiltersToQuery = (
  filters: FilterInput,
  tableIdentifier: IdentifierSqlToken,
): FragmentSqlToken => {
  const queryFilter = buildFilterFragment(filters, tableIdentifier);

  return queryFilter ? sql.fragment`WHERE ${queryFilter}` : sql.fragment``;
};

const buildFilterFragment = (
  filter: FilterInput,
  tableIdentifier: IdentifierSqlToken,
): FragmentSqlToken | undefined => {
  // Handle empty filters
  if (!filter) {
    return undefined;
  }

  // Handle AND operations
  if ("AND" in filter) {
    if (!filter.AND || filter.AND.length === 0) {
      return undefined;
    }

    const andFragments: FragmentSqlToken[] = [];

    for (const subFilter of filter.AND) {
      const fragment = buildFilterFragment(subFilter, tableIdentifier);

      if (fragment) {
        andFragments.push(fragment);
      }
    }

    if (andFragments.length === 0) {
      return undefined;
    }

    if (andFragments.length === 1) {
      return andFragments[0];
    }

    return sql.fragment`(${sql.join(andFragments, sql.fragment` AND `)})`;
  }

  // Handle OR operations
  if ("OR" in filter) {
    if (!filter.OR || filter.OR.length === 0) {
      return undefined;
    }

    const orFragments: FragmentSqlToken[] = [];

    for (const subFilter of filter.OR) {
      const fragment = buildFilterFragment(subFilter, tableIdentifier);

      if (fragment) {
        orFragments.push(fragment);
      }
    }

    if (orFragments.length === 0) {
      return undefined;
    }

    if (orFragments.length === 1) {
      return orFragments[0];
    }

    return sql.fragment`(${sql.join(orFragments, sql.fragment` OR `)})`;
  }

  return applyFilter(tableIdentifier, filter as BaseFilterInput);
};

export { applyFilter, applyFiltersToQuery, buildFilterFragment };
