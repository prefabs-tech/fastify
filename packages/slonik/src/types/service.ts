import type { Database, FilterInput, SortInput } from "./database";
import type { ApiConfig } from "@prefabs.tech/fastify-config";

type PaginatedList<T> = {
  totalCount: number;
  filteredCount: number;
  data: readonly T[];
};

interface Service<T, C, U> {
  config: ApiConfig;
  database: Database;
  schema: "public" | string;

  all(fields: string[]): Promise<Partial<readonly T[]>>;
  create(data: C): Promise<T | undefined>;
  delete(id: number | string, force?: boolean): Promise<T | null>;
  find(filters?: FilterInput, sort?: SortInput[]): Promise<readonly T[]>;
  findById(id: number | string): Promise<T | null>;
  findOne(filters?: FilterInput, sort?: SortInput[]): Promise<T | null>;
  list(
    limit?: number,
    offset?: number,
    filters?: FilterInput,
    sort?: SortInput[],
  ): Promise<PaginatedList<T>>;
  count(filters?: FilterInput): Promise<number>;
  update(id: number | string, data: U): Promise<T>;
}

export type { PaginatedList, Service };
