import { ApiConfig } from "@prefabs.tech/fastify-config";
import Stripe from "stripe";

import { CreateSessionInput } from "../types";

class StripeClient {
  public stripe: Stripe;
  protected _config: ApiConfig;

  constructor(config: ApiConfig) {
    this._config = config;
    this.stripe = new Stripe(config.stripe.apiKey, config.stripe.clientConfig);
  }

  public async createCheckoutSession(
    input: CreateSessionInput,
    metadata?: Record<string, string>,
  ): Promise<Stripe.Response<Stripe.Checkout.Session>> {
    const mode = input.mode ?? "payment";

    const parameters: Stripe.Checkout.SessionCreateParams = {
      allow_promotion_codes: this._config.stripe.allowPromotionCodes,
      cancel_url: input.cancelUrl ?? this._config.stripe.urls.cancel,
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
      mode,
      success_url: input.successUrl ?? this._config.stripe.urls.success,
    };

    // Stripe rejects mode-specific `*_data` blocks for the wrong mode, so
    // route metadata to the field that matches the selected mode.
    switch (mode) {
      case "payment": {
        parameters.payment_intent_data = { metadata: metadata };
        break;
      }
      case "setup": {
        parameters.setup_intent_data = { metadata: metadata };
        break;
      }
      case "subscription": {
        parameters.subscription_data = { metadata: metadata };
        break;
      }
    }

    return this.stripe.checkout.sessions.create(parameters);
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
