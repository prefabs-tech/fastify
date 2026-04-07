import type { ConnectionRoutine, DatabasePool, QueryFunction } from "slonik";

type BaseFilterInput = {
  insensitive?: boolean | string;
  key: string;
  not?: boolean | string;
  operator: operator;
  value: string;
};

type Database = {
  connect: <T>(connectionRoutine: ConnectionRoutine<T>) => Promise<T>;
  pool: DatabasePool;
  query: QueryFunction;
};

type FilterInput =
  | {
      AND: FilterInput[];
    }
  | {
      OR: FilterInput[];
    }
  | BaseFilterInput;

type operator =
  | "bt"
  | "ct"
  | "dwithin"
  | "eq"
  | "ew"
  | "gt"
  | "gte"
  | "in"
  | "lt"
  | "lte"
  | "sw";

type SortDirection = "ASC" | "DESC";

type SortInput = {
  direction: SortDirection;
  insensitive?: boolean | string;
  key: string;
};

export type {
  BaseFilterInput,
  Database,
  FilterInput,
  SortDirection,
  SortInput,
};
