import type { ConnectionRoutine, DatabasePool, QueryFunction } from "slonik";

type Database = {
  connect: <T>(connectionRoutine: ConnectionRoutine<T>) => Promise<T>;
  pool: DatabasePool;
  query: QueryFunction;
};

type operator =
  | "ct"
  | "dwithin"
  | "sw"
  | "ew"
  | "eq"
  | "gt"
  | "gte"
  | "lte"
  | "lt"
  | "in"
  | "bt";

type BaseFilterInput = {
  key: string;
  operator: operator;
  not?: boolean;
  value: string;
  insensitive?: boolean | string;
};

type FilterInput =
  | BaseFilterInput
  | {
      AND: FilterInput[];
    }
  | {
      OR: FilterInput[];
    };

type SortDirection = "ASC" | "DESC";

type SortInput = {
  key: string;
  direction: SortDirection;
  insensitive?: boolean | string;
};

export type {
  BaseFilterInput,
  Database,
  FilterInput,
  SortDirection,
  SortInput,
};
