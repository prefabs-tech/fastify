import { ApiConfig } from "@prefabs.tech/fastify-config";
import Stripe from "stripe";

import { STRIPE_API_VERSION } from "../constants";
import { CreateSessionInput } from "../types";

class StripeClient {
  protected _config: ApiConfig;
  public stripe: Stripe;

  constructor(config: ApiConfig) {
    this._config = config;
    this.stripe = new Stripe(config.stripe.apiKey, {
      apiVersion: STRIPE_API_VERSION,
    });
  }

  public async createCheckoutSession(
    input: CreateSessionInput,
    metadata?: Record<string, string>,
  ): Promise<Stripe.Response<Stripe.Checkout.Session>> {
    const session = await this.stripe.checkout.sessions.create({
      allow_promotion_codes: this._config.stripe.allowPromotionCodes,
      cancel_url: input.cancelUrl ?? this._config.stripe.redirectUrl.cancel,
      line_items: [
        {
          price_data: {
            currency: input.currency ?? this._config.stripe.defaultCurrency,
            product_data: {
              name: input.productName,
            },
            unit_amount: input.unitAmount,
          },
          quantity: input.quantity ?? 1,
        },
      ],
      metadata: metadata,
      payment_intent_data: {
        metadata: metadata,
      },
      mode: input.mode ?? "payment",
      success_url: input.successUrl ?? this._config.stripe.redirectUrl.success,
    });

    return session;
  }

  public async getActivePromotionCode(
    code: string,
  ): Promise<Stripe.PromotionCode | undefined> {
    const codes = await this.stripe.promotionCodes.list({
      active: true,
      code: code,
    });

    return codes.data[0];
  }
}

export default StripeClient;
