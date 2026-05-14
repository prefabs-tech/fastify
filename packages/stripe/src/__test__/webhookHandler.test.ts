import { describe, expect, it, vi } from "vitest";

import handleWebhook from "../webhook/handler";

const buildRequest = () => ({
  log: { error: vi.fn() },
});

const buildEvent = () => ({
  id: "evt_test_1",
  type: "checkout.session.completed",
});

describe("default webhookHandler (fallback)", () => {
  it("resolves (does not throw) so the route responds 200 and Stripe stops retrying", async () => {
    await expect(
      handleWebhook(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        buildRequest() as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        buildEvent() as any,
      ),
    ).resolves.toBeUndefined();
  });

  it("logs an error containing the event id and type when invoked", async () => {
    const request = buildRequest();
    const event = buildEvent();

    await handleWebhook(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      request as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      event as any,
    );

    expect(request.log.error).toHaveBeenCalledTimes(1);
    expect(request.log.error).toHaveBeenCalledWith(
      { eventId: event.id, eventType: event.type },
      expect.stringContaining(
        "Stripe webhook received but no handler is configured",
      ),
    );
  });
});
