import { print } from "graphql";
import { describe, expect, it } from "vitest";

import baseSchema from "../baseSchema";

describe("baseSchema", () => {
  it("includes documented directives, scalars, inputs, enum, and types", () => {
    const printed = print(baseSchema);

    expect(printed).toContain("directive @auth");
    expect(printed).toContain("directive @hasPermission");
    expect(printed).toContain("scalar DateTime");
    expect(printed).toContain("scalar JSON");
    expect(printed).toContain("input Filters");
    expect(printed).toContain("enum SortDirection");
    expect(printed).toContain("input SortInput");
    expect(printed).toContain("type DeleteResult");
  });
});
