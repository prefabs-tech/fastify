import type { ApiConfig } from "@prefabs.tech/fastify-config";

import type { Database, FilterInput, SortInput } from "./database";

type PaginatedList<T> = {
  data: readonly T[];
  filteredCount: number;
  totalCount: number;
};

interface Service<T, C, U> {
  all(fields: string[]): Promise<Partial<readonly T[]>>;
  config: ApiConfig;
  count(filters?: FilterInput): Promise<number>;

  create(data: C): Promise<T | undefined>;
  database: Database;
  delete(id: number | string, force?: boolean): Promise<null | T>;
  find(filters?: FilterInput, sort?: SortInput[]): Promise<readonly T[]>;
  findById(id: number | string): Promise<null | T>;
  findOne(filters?: FilterInput, sort?: SortInput[]): Promise<null | T>;
  list(
    limit?: number,
    offset?: number,
    filters?: FilterInput,
    sort?: SortInput[],
  ): Promise<PaginatedList<T>>;
  schema: "public" | string;
  update(id: number | string, data: U): Promise<T>;
}

export type { PaginatedList, Service };
