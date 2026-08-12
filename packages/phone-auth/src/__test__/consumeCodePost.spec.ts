import { describe, expect, it } from "vitest";

import { enrichResult } from "../recipe/consumeCodePost";

const okResult = (user: {
  emails: string[];
  id: string;
  phoneNumbers: string[];
}) =>
  ({
    createdNewRecipeUser: false,
    session: {},
    status: "OK" as const,
    user,
  }) as Parameters<typeof enrichResult>[0];

describe("enrichResult", () => {
  it("fills empty emails with a synthetic address and sets compat aliases", () => {
    const result = enrichResult(
      okResult({
        emails: [],
        id: "user-1",
        phoneNumbers: ["+15551234567"],
      }),
      "+15551234567",
      "example.com",
    );

    expect(result).toMatchObject({
      status: "OK",
      user: {
        email: "+15551234567@example.com",
        emails: ["+15551234567@example.com"],
        phoneNumber: "+15551234567",
      },
    });
  });

  it("keeps non-empty emails and sets compat aliases from v16 arrays", () => {
    const result = enrichResult(
      okResult({
        emails: ["existing@example.com"],
        id: "user-1",
        phoneNumbers: ["+15557654321"],
      }),
      "+15551234567",
      "example.com",
    );

    expect(result).toMatchObject({
      status: "OK",
      user: {
        email: "existing@example.com",
        emails: ["existing@example.com"],
        phoneNumber: "+15557654321",
      },
    });
  });

  it("falls back to the device phoneNumber when phoneNumbers is empty", () => {
    const result = enrichResult(
      okResult({
        emails: ["a@example.com"],
        id: "user-1",
        phoneNumbers: [],
      }),
      "+15550001111",
      "example.com",
    );

    expect(result).toMatchObject({
      user: {
        email: "a@example.com",
        phoneNumber: "+15550001111",
      },
    });
  });

  it("passes through non-OK results unchanged", () => {
    const restart = { status: "RESTART_FLOW_ERROR" as const };

    expect(enrichResult(restart, "+15551234567", "example.com")).toBe(restart);
  });
});
