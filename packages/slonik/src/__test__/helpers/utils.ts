import type { FilterInput, SortInput } from "../../types";

const getFilterDataset = (): FilterInput[] => {
  return [
    { key: "name", operator: "sw", value: "s" },
    {
      AND: [
        { key: "name", operator: "sw", value: "s" },
        { key: "latitude", operator: "gt", value: "40" },
      ],
    },
    {
      OR: [
        { key: "name", operator: "sw", value: "Test" },
        { key: "name", operator: "ew", value: "t1" },
      ],
    },
    {
      AND: [
        { key: "id", operator: "gt", value: "10" },
        {
          OR: [
            { key: "name", operator: "sw", value: "Test" },
            { key: "name", operator: "ew", value: "t1" },
          ],
        },
      ],
    },
    {
      OR: [
        { key: "id", operator: "gt", value: "10" },
        {
          AND: [
            { key: "name", operator: "sw", value: "Test" },
            { key: "name", operator: "ew", value: "t1" },
          ],
        },
      ],
    },
  ];
};

const getLimitAndOffsetDataset = async (count: number, config: ApiConfig) => {
  return [
    () => {
      const limit = Math.floor((Math.random() * count) / 2);
      const offset = Math.floor((Math.random() * count) / 2);
      const useCase = "General case";

      return {
        limit,
        offset,
        useCase,
      };
    },
    () => {
      const offset = Math.floor((Math.random() * count) / 2);
      const useCase = "Limit too large";

      return {
        limit: count * 2,
        offset: offset,
        useCase,
      };
    },
    () => {
      const useCase = "Invalid offset";

      return {
        limit: Math.floor((Math.random() * count) / 2),
        offset: count,
        useCase,
      };
    },
    () => {
      const useCase = "0 values";

      return {
        limit: 0,
        offset: 0,
        result: [],
        useCase,
      };
    },
    () => {
      const useCase = "Undefined values";

      return {
        limit: undefined,
        offset: undefined,
        useCase,
      };
    },
    () => {
      const useCase = "Limit greater than max_limit";

      return {
        limit: (config?.slonik?.pagination?.maxLimit ?? 999_999) + 1,
        offset: 0,
        useCase,
      };
    },
  ];
};

const getSortDataset = (): SortInput[][] => {
  return [
    [{ key: "name", direction: "ASC" }],
    [{ key: "id", direction: "DESC" }],
    [{ key: "countryCode", direction: "ASC" }],
    [{ key: "country_code", direction: "DESC" }],
    [
      { key: "id", direction: "DESC" },
      { key: "name", direction: "ASC" },
    ],
  ];
};

export { getFilterDataset, getLimitAndOffsetDataset, getSortDataset };
