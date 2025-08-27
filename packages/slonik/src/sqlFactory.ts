import humps from "humps";
import { sql } from "slonik";
import { z } from "zod";

import {
  createFilterFragment,
  createLimitFragment,
  createSortFragment,
  createTableFragment,
  createTableIdentifier,
  createWhereFragment,
  isValueExpression,
} from "./sql";

import type {
  Database,
  FilterInput,
  SqlFactory,
  SortInput,
  SortDirection,
} from "./types";
import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type {
  FragmentSqlToken,
  IdentifierSqlToken,
  QuerySqlToken,
} from "slonik";

class DefaultSqlFactory implements SqlFactory {
  static readonly TABLE = undefined as unknown as string;
  static readonly LIMIT_DEFAULT: number = 20;
  static readonly LIMIT_MAX: number = 50;
  static readonly SORT_DIRECTION: SortDirection = "ASC";
  static readonly SORT_KEY: string = "id";

  protected _config: ApiConfig;
  protected _database: Database;
  protected _factory: SqlFactory | undefined;
  protected _schema = "public";
  protected _validationSchema: z.ZodTypeAny = z.any();
  protected _softDeleteEnabled: boolean = false;

  constructor(config: ApiConfig, database: Database, schema?: string) {
    this._config = config;
    this._database = database;

    if (schema) {
      this._schema = schema;
    }
  }

  getAllSql(fields: string[], sort?: SortInput[]): QuerySqlToken {
    const identifiers = [];

    const fieldsObject: Record<string, true> = {};

    for (const field of fields) {
      identifiers.push(sql.identifier([humps.decamelize(field)]));
      fieldsObject[humps.camelize(field)] = true;
    }

    // [RL 2023-03-30] this should be done checking if the validation schema is of instanceof ZodObject
    const allSchema =
      this.validationSchema._def.typeName === "ZodObject"
        ? (this.validationSchema as z.AnyZodObject).pick(fieldsObject)
        : z.any();

    return sql.type(allSchema)`
      SELECT ${sql.join(identifiers, sql.fragment`, `)}
      FROM ${this.tableFragment}
      ${this.getWhereFragment()}
      ${this.getSortFragment(sort)}
    `;
  }

  getCountSql(filters?: FilterInput): QuerySqlToken {
    const countSchema = z.object({
      count: z.number(),
    });

    return sql.type(countSchema)`
      SELECT COUNT(*)
      FROM ${this.tableFragment}
      ${this.getWhereFragment({ filters })};
    `;
  }

  getCreateSql(data: Record<string, unknown>): QuerySqlToken {
    const identifiers = [];
    const values = [];

    for (const column in data) {
      const value = data[column];

      if (!isValueExpression(value)) {
        continue;
      }

      identifiers.push(sql.identifier([humps.decamelize(column)]));
      values.push(value);
    }

    return sql.type(this.validationSchema)`
      INSERT INTO ${this.tableFragment}
        (${sql.join(identifiers, sql.fragment`, `)})
      VALUES (${sql.join(values, sql.fragment`, `)})
      RETURNING *;
    `;
  }

  getDeleteSql(id: number | string, force: boolean = false): QuerySqlToken {
    if (this.softDeleteEnabled && !force) {
      return sql.type(this.validationSchema)`
        UPDATE ${this.tableFragment}
        SET deleted_at = NOW()
        WHERE id = ${id}
        RETURNING *;
      `;
    }

    return sql.type(this.validationSchema)`
      DELETE FROM ${this.tableFragment}
      WHERE id = ${id}
      RETURNING *;
    `;
  }

  getFindByIdSql(id: number | string): QuerySqlToken {
    return sql.type(this.validationSchema)`
      SELECT *
      FROM ${this.tableFragment}
      ${this.getWhereFragment({ filterFragment: sql.fragment`id = ${id}` })};
    `;
  }

  getFindOneSql(filters?: FilterInput, sort?: SortInput[]): QuerySqlToken {
    return sql.type(this.validationSchema)`
      SELECT *
      FROM ${this.tableFragment}
      ${this.getWhereFragment({ filters })}
      ${this.getSortFragment(sort)}
      LIMIT 1;
    `;
  }

  getFindSql(filters?: FilterInput, sort?: SortInput[]): QuerySqlToken {
    return sql.type(this.validationSchema)`
      SELECT *
      FROM ${this.tableFragment}
      ${this.getWhereFragment({ filters })}
      ${this.getSortFragment(sort)};
    `;
  }

  getListSql(
    limit?: number,
    offset?: number,
    filters?: FilterInput,
    sort?: SortInput[],
  ): QuerySqlToken {
    return sql.type(this.validationSchema)`
      SELECT *
      FROM ${this.tableFragment}
      ${this.getWhereFragment({ filters })}
      ${this.getSortFragment(sort)}
      ${this.getLimitFragment(limit, offset)};
    `;
  }

  /**
   * @deprecated Use the `this.tableFragment` getter instead.
   */
  getTableFragment(): FragmentSqlToken {
    return this.tableFragment;
  }

  getUpdateSql(
    id: number | string,
    data: Record<string, unknown>,
  ): QuerySqlToken {
    const columns = [];

    for (const column in data) {
      const value = data[column];

      if (!isValueExpression(value)) {
        continue;
      }

      columns.push(
        sql.fragment`${sql.identifier([humps.decamelize(column)])} = ${value}`,
      );
    }

    return sql.type(this.validationSchema)`
      UPDATE ${this.tableFragment}
      SET ${sql.join(columns, sql.fragment`, `)}
      ${this.getWhereFragment({ filterFragment: sql.fragment`id = ${id}` })}
      RETURNING *;
    `;
  }

  get config(): ApiConfig {
    return this._config;
  }

  get database(): Database {
    return this._database;
  }

  get limitDefault(): number {
    return (
      this.config.slonik?.pagination?.defaultLimit ||
      (this.constructor as typeof DefaultSqlFactory).LIMIT_DEFAULT
    );
  }

  get limitMax(): number {
    return (
      this.config.slonik?.pagination?.maxLimit ||
      (this.constructor as typeof DefaultSqlFactory).LIMIT_MAX
    );
  }

  get schema(): string {
    return this._schema || "public";
  }

  get sortDirection(): SortDirection {
    return (this.constructor as typeof DefaultSqlFactory).SORT_DIRECTION;
  }

  get sortKey(): string {
    return (this.constructor as typeof DefaultSqlFactory).SORT_KEY;
  }

  get table(): string {
    return (this.constructor as typeof DefaultSqlFactory).TABLE;
  }

  get tableFragment(): FragmentSqlToken {
    return createTableFragment(this.table, this.schema);
  }

  get tableIdentifier(): IdentifierSqlToken {
    return createTableIdentifier(this.table);
  }

  get validationSchema(): z.ZodTypeAny {
    return this._validationSchema || z.any();
  }

  get softDeleteEnabled(): boolean {
    return this._softDeleteEnabled;
  }

  protected getAdditionalFilterFragments(): FragmentSqlToken[] {
    return [];
  }

  protected getWhereFragment(options?: {
    filters?: FilterInput;
    filterFragment?: FragmentSqlToken;
    includeSoftDelete?: boolean;
    tableIdentifier?: IdentifierSqlToken;
  }): FragmentSqlToken {
    const {
      filters,
      includeSoftDelete = true,
      filterFragment,
      tableIdentifier = this.tableIdentifier,
    } = options || {};

    const fragments: FragmentSqlToken[] = [];

    if (filterFragment) {
      fragments.push(filterFragment);
    }

    if (includeSoftDelete && this.softDeleteEnabled) {
      fragments.push(sql.fragment`${this.tableIdentifier}.deleted_at IS NULL`);
    }

    fragments.push(...this.getAdditionalFilterFragments());

    return this.getCreateWhereFragment(tableIdentifier, filters, fragments);
  }

  protected getCreateWhereFragment(
    tableIdentifier: IdentifierSqlToken,
    filters: FilterInput | undefined,
    fragments: FragmentSqlToken[] | undefined,
  ): FragmentSqlToken {
    return createWhereFragment(tableIdentifier, filters, fragments);
  }

  protected getFilterFragment(filters?: FilterInput): FragmentSqlToken {
    return createFilterFragment(filters, this.tableIdentifier);
  }

  protected getLimitFragment(
    limit?: number,
    offset?: number,
  ): FragmentSqlToken {
    limit = Math.min(limit ?? this.limitDefault, this.limitMax);

    return createLimitFragment(limit, offset);
  }

  protected getSoftDeleteFilterFragment(addWhere: boolean): FragmentSqlToken {
    return this.softDeleteEnabled
      ? addWhere
        ? sql.fragment`WHERE ${this.tableIdentifier}.deleted_at IS NULL`
        : sql.fragment`AND ${this.tableIdentifier}.deleted_at IS NULL`
      : sql.fragment``;
  }

  protected getSortFragment(sort?: SortInput[]): FragmentSqlToken {
    return createSortFragment(this.tableIdentifier, this.getSortInput(sort));
  }

  protected getSortInput(sort?: SortInput[]): SortInput[] {
    return (
      sort || [
        {
          key: this.sortKey,
          direction: this.sortDirection,
        },
      ]
    );
  }
}

export default DefaultSqlFactory;
