import { describe, expect, it } from "vitest";

import webhookHandler from "../webhook/handler";

describe("default webhook handler", () => {
  it('throws "Webhook handler not implemented"', async () => {
    const request = {} as Parameters<typeof webhookHandler>[0];
    const event = { id: "evt_1", type: "ping" } as Parameters<
      typeof webhookHandler
    >[1];

    await expect(webhookHandler(request, event)).rejects.toThrow(
      "Webhook handler not implemented",
    );
  });
});
