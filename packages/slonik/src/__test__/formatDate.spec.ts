import { describe, expect, it } from "vitest";

import formatDate from "../formatDate.js";

describe.concurrent("formatDate", () => {
  it.each([
    [new Date(0), "1970-01-01 00:00:00.000"],
    // eslint-disable-next-line unicorn/numeric-separators-style
    [new Date(1682403649219), "2023-04-25 06:20:49.219"],
  ])("formatDate(date) -> datetime", async (date, formatedDate) => {
    expect(formatDate(date)).toBe(formatedDate);
  });
});
