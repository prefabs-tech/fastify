import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FastifyReply, FastifyRequest } from "fastify";

const mockConstructEvent = vi.fn();

vi.mock("stripe", () => ({
  default: vi.fn(),
}));

const createReply = (): FastifyReply =>
  ({
    send: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  }) as unknown as FastifyReply;

const baseStripe = {
  apiKey: "sk_test_x",
  clientConfig: { timeout: 12345 },
  defaultCurrency: "usd",
  enablePaymentWebhook: true,
  urls: { cancel: "http://c", success: "http://s" },
  webhookSecret: "whsec_test",
};

const createRequest = (
  overrides: Partial<{
    headers: Record<string, string | string[] | undefined>;
    rawBody: Buffer;
    webhookSecret: string | undefined;
  }> = {},
): FastifyRequest => {
  const replyLog = { error: vi.fn() };
  const webhookSecret =
    "webhookSecret" in overrides
      ? overrides.webhookSecret
      : baseStripe.webhookSecret;

  return {
    headers: {
      "stripe-signature": "v1=fake",
      ...overrides.headers,
    },
    rawBody: overrides.rawBody ?? Buffer.from("{}"),
    server: {
      config: {
        stripe: {
          ...baseStripe,
          webhookSecret,
        },
      },
      log: replyLog,
    },
  } as unknown as FastifyRequest;
};

describe("verifyStripeSignature", async () => {
  const { default: Stripe } = await import("stripe");
  const { default: verifyStripeSignature } =
    await import("../middlewares/verifyStripeSignature");

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Stripe).mockImplementation(
      () =>
        ({
          webhooks: {
            constructEvent: mockConstructEvent,
          },
        }) as unknown as InstanceType<typeof Stripe>,
    );
  });

  it("responds with 400 when webhook secret is not configured", async () => {
    const reply = createReply();
    const request = createRequest({ webhookSecret: undefined });

    await verifyStripeSignature(request, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      error: "Webhook secret not configured",
    });
    expect(mockConstructEvent).not.toHaveBeenCalled();
  });

  it("responds with 400 when stripe-signature header is missing", async () => {
    const reply = createReply();
    const request = createRequest({
      headers: { "stripe-signature": undefined },
    });

    await verifyStripeSignature(request, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      error: "Missing stripe-signature header",
    });
    expect(mockConstructEvent).not.toHaveBeenCalled();
  });

  it("responds with 400 when rawBody is missing", async () => {
    const reply = createReply();
    const request = createRequest({});
    (request as unknown as { rawBody?: Buffer }).rawBody = undefined;

    await verifyStripeSignature(request, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      error: "Raw body is not available for signature verification",
    });
    expect(mockConstructEvent).not.toHaveBeenCalled();
  });

  it("responds with 400 when signature verification throws", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("bad sig");
    });

    const reply = createReply();
    await verifyStripeSignature(createRequest(), reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      error: "Webhook signature verification failed",
    });
  });

  it("passes apiKey and clientConfig into Stripe and attaches stripeEvent on success", async () => {
    const event = { id: "evt_1", type: "checkout.session.completed" };
    mockConstructEvent.mockReturnValue(event);

    const reply = createReply();
    const raw = Buffer.from('{"x":1}');
    const request = createRequest({ rawBody: raw });

    await verifyStripeSignature(request, reply);

    expect(vi.mocked(Stripe)).toHaveBeenCalledWith(
      baseStripe.apiKey,
      baseStripe.clientConfig,
    );
    expect(mockConstructEvent).toHaveBeenCalledWith(
      raw,
      "v1=fake",
      baseStripe.webhookSecret,
    );
    expect(
      (request as FastifyRequest & { stripeEvent?: unknown }).stripeEvent,
    ).toBe(event);
    expect(reply.status).not.toHaveBeenCalled();
  });
});
