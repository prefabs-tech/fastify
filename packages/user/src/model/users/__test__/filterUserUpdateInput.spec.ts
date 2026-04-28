/* istanbul ignore file */
import { describe, expect, it } from "vitest";

import type { UserUpdateInput } from "../../../types";

import filterUserUpdateInput from "../filterUserUpdateInput";

describe("filterUserUpdateInput", () => {
  it("does not remove a valid mutable input key", () => {
    const updateInput = {
      middleNames: "A",
    } as UserUpdateInput;

    filterUserUpdateInput(updateInput);

    expect(updateInput).toHaveProperty("middleNames");
  });

  it("removes 'email'", () => {
    const updateInput = { email: "user@example.com" } as UserUpdateInput;

    filterUserUpdateInput(updateInput);

    expect(updateInput).not.toHaveProperty("email");
  });

  it("removes 'id'", () => {
    const updateInput = { id: "some-id" } as UserUpdateInput;

    filterUserUpdateInput(updateInput);

    expect(updateInput).not.toHaveProperty("id");
  });

  it("removes 'roles'", () => {
    const updateInput = { roles: ["ADMIN"] } as UserUpdateInput;

    filterUserUpdateInput(updateInput);

    expect(updateInput).not.toHaveProperty("roles");
  });

  it("removes 'disable'", () => {
    const updateInput = { disable: true } as UserUpdateInput;

    filterUserUpdateInput(updateInput);

    expect(updateInput).not.toHaveProperty("disable");
  });

  it("removes 'enable'", () => {
    const updateInput = { enable: true } as UserUpdateInput;

    filterUserUpdateInput(updateInput);

    expect(updateInput).not.toHaveProperty("enable");
  });

  it("removes camelCase 'lastLoginAt'", () => {
    const updateInput = {
      lastLoginAt: "2023-06-13 04:02:45.825",
    } as UserUpdateInput;

    filterUserUpdateInput(updateInput);

    expect(updateInput).not.toHaveProperty("lastLoginAt");
  });

  it("removes mixed 'lastLogin_at' (camelized to lastLoginAt)", () => {
    const updateInput = {
      lastLogin_at: "2023-06-13 04:02:45.825",
    } as UserUpdateInput;

    filterUserUpdateInput(updateInput);

    expect(updateInput).not.toHaveProperty("lastLogin_at");
  });

  it("removes snake_case 'last_login_at' (camelized to lastLoginAt)", () => {
    const updateInput = {
      last_login_at: "2023-06-13 04:02:45.825",
    } as UserUpdateInput;

    filterUserUpdateInput(updateInput);

    expect(updateInput).not.toHaveProperty("last_login_at");
  });

  it("removes camelCase 'signedUpAt'", () => {
    const updateInput = { signedUpAt: 1_234_567_890 } as UserUpdateInput;

    filterUserUpdateInput(updateInput);

    expect(updateInput).not.toHaveProperty("signedUpAt");
  });

  it("removes snake_case 'signed_up_at' (camelized to signedUpAt)", () => {
    const updateInput = { signed_up_at: 1_234_567_890 } as UserUpdateInput;

    filterUserUpdateInput(updateInput);

    expect(updateInput).not.toHaveProperty("signed_up_at");
  });

  it("removes blocked fields while preserving valid fields in a mixed input", () => {
    const updateInput = {
      email: "user@example.com",
      last_login_at: "2023-06-13 04:02:45.825",
      middleNames: "A",
      photoId: 42,
    } as UserUpdateInput;

    filterUserUpdateInput(updateInput);

    expect(updateInput).toHaveProperty("middleNames");
    expect(updateInput).toHaveProperty("photoId");
    expect(updateInput).not.toHaveProperty("email");
    expect(updateInput).not.toHaveProperty("last_login_at");
  });

  it("mutates the input object in place", () => {
    const updateInput = { email: "user@example.com" } as UserUpdateInput;
    const reference = updateInput;

    filterUserUpdateInput(updateInput);

    // Same object reference — no new object created
    expect(updateInput).toBe(reference);
  });
});
