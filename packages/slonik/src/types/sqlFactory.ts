import type { ApiConfig } from "@prefabs.tech/fastify-config";
import type {
  FragmentSqlToken,
  IdentifierSqlToken,
  QuerySqlToken,
} from "slonik";

import type { Database, FilterInput, SortInput } from "../types";

interface SqlFactory {
  config: ApiConfig;
  database: Database;
  getAllSql(fields: string[], sort?: SortInput[]): QuerySqlToken;
  getCountSql(filters?: FilterInput): QuerySqlToken;
  getCreateSql(data: Record<string, unknown>): QuerySqlToken;
  getDeleteSql(id: number | string, force?: boolean): QuerySqlToken;
  getFindByIdSql(id: number | string): QuerySqlToken;
  getFindOneSql(filters?: FilterInput, sort?: SortInput[]): QuerySqlToken;

  getFindSql(filters?: FilterInput, sort?: SortInput[]): QuerySqlToken;
  getListSql(
    limit?: number,
    offset?: number,
    filters?: FilterInput,
    sort?: SortInput[],
  ): QuerySqlToken;
  getTableFragment(): FragmentSqlToken;
  getUpdateSql(
    id: number | string,
    data: Record<string, unknown>,
  ): QuerySqlToken;
  limitDefault: number;
  limitMax: number;
  schema: "public" | string;
  table: string;
  tableFragment: FragmentSqlToken;
  tableIdentifier: IdentifierSqlToken;
}

export type { SqlFactory };
