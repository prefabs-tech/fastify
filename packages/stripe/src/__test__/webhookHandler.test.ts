import { describe, expect, it } from "vitest";

import handleWebhook from "../webhook/handler";

describe("default webhookHandler (sentinel)", () => {
  it("throws 'Webhook handler not implemented' so consumers who forget to wire handlers.webhook get a hard failure", async () => {
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handleWebhook({} as any, {} as any),
    ).rejects.toThrow("Webhook handler not implemented");
  });
});
