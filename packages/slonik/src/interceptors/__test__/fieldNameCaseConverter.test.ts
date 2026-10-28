/* istanbul ignore file */
import { describe, expect, it } from "vitest";

import fieldNameCaseConverter from "../fieldNameCaseConverter.js";
import createQueryContext from "./helpers/createQueryContext.js";

describe("fielNameCaseConverter interceptor", () => {
  const interceptor = fieldNameCaseConverter;

  it("transforms result field names to camelcase", () => {
    const { transformRow } = interceptor;

    if (!transformRow) {
      throw new Error("Unexpected state.");
    }

    const result = transformRow(
      createQueryContext(),
      {
        sql: "SELECT 1",
        values: [],
      },
      {
        created_at: "2022-01-01 00:00:01",
        foo_bar: 1,
        is_enabled: true,
        is_enabled_some_of_the_time: false,
        /* [OP 2023-01-28] See https://github.com/gajus/slonik/issues/428
        object_child: {
          user_id: 1,
        },
        some_children: [
          {
            user_id: 1,
          },
          {
            user_id: 2,
          },
        ],
        */
        updated_at: "2022-01-01 00:00:01",
      },
      [
        {
          dataTypeId: 1,
          name: "foo_bar",
        },
      ],
    );

    const expected = {
      createdAt: "2022-01-01 00:00:01",
      fooBar: 1,
      isEnabled: true,
      isEnabledSomeOfTheTime: false,
      /* [OP 2023-01-28] See https://github.com/gajus/slonik/issues/428
      firstChild: {
        userId: 1,
      },
      someChildren: [
        {
          userId: 1,
        },
        {
          userId: 2,
        },
      ],
      */
      updatedAt: "2022-01-01 00:00:01",
    };

    expect(expected).toEqual(result);
  });
});
