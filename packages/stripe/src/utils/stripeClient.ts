import { ApiConfig } from "@prefabs.tech/fastify-config";
import Stripe from "stripe";

import { CreateSessionInput, StripeConfig } from "../types";

class StripeClient {
  public stripe: Stripe;
  protected _config: ApiConfig;
  protected _stripeConfig: StripeConfig;

  constructor(config: ApiConfig) {
    if (!config.stripe) {
      throw new Error(
        "StripeClient requires config.stripe to be set on the provided ApiConfig.",
      );
    }

    this._config = config;
    this._stripeConfig = config.stripe;
    this.stripe = new Stripe(config.stripe.apiKey, config.stripe.clientConfig);
  }

  public async createCheckoutSession(
    input: CreateSessionInput,
    metadata?: Record<string, string>,
  ): Promise<Stripe.Response<Stripe.Checkout.Session>> {
    const mode = input.mode ?? "payment";

    const parameters: Stripe.Checkout.SessionCreateParams = {
      allow_promotion_codes: this._stripeConfig.allowPromotionCodes,
      cancel_url: input.cancelUrl ?? this._stripeConfig.urls.cancel,
      line_items: [
        {
          price_data: {
            currency: input.currency ?? this._stripeConfig.defaultCurrency,
            product_data: {
              name: input.productName,
            },
            unit_amount: input.unitAmount,
          },
          quantity: input.quantity ?? 1,
        },
      ],
      mode,
      success_url: input.successUrl ?? this._stripeConfig.urls.success,
    };

    // Only populate metadata fields when metadata was actually supplied.
    // Stripe rejects mode-specific `*_data` blocks for the wrong mode, so
    // route metadata to the field that matches the selected mode.
    if (metadata) {
      parameters.metadata = metadata;

      switch (mode) {
        case "payment": {
          parameters.payment_intent_data = { metadata };
          break;
        }
        case "setup": {
          parameters.setup_intent_data = { metadata };
          break;
        }
        case "subscription": {
          parameters.subscription_data = { metadata };
          break;
        }
      }
    }

    return this.stripe.checkout.sessions.create(parameters);
  }

  public async createCustomer(
    parameters: Stripe.CustomerCreateParams,
  ): Promise<Stripe.Response<Stripe.Customer>> {
    return this.stripe.customers.create(parameters);
  }

  /**
   * Find the first customer matching the given email address.
   * Returns `undefined` when no match is found.
   */
  public async findCustomerByEmail(
    email: string,
  ): Promise<Stripe.Customer | undefined> {
    const customers = await this.stripe.customers.list({
      email,
      limit: 1,
    });

    return customers.data[0];
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

  /**
   * Retrieve a Stripe customer by ID.
   */
  public async getCustomer(
    customerId: string,
  ): Promise<Stripe.Response<Stripe.Customer | Stripe.DeletedCustomer>> {
    return this.stripe.customers.retrieve(customerId);
  }

  /**
   * Update a Stripe customer.
   */
  public async updateCustomer(
    customerId: string,
    parameters: Stripe.CustomerUpdateParams,
  ): Promise<Stripe.Response<Stripe.Customer>> {
    return this.stripe.customers.update(customerId, parameters);
  }
}

export default StripeClient;
