"use node";

import Stripe from "stripe";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

/**
 * Lazily construct a Stripe client from the Convex-side env var. Throws a
 * clear, user-safe ConvexError instead of letting the Stripe SDK crash
 * ambiguously when the key is missing (e.g. in dev before keys are set).
 */
function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new ConvexError("NOT_CONFIGURED: STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(secretKey);
}

function getSiteUrl(): string {
  const siteUrl = process.env.SITE_URL;
  if (!siteUrl) {
    throw new ConvexError("NOT_CONFIGURED: SITE_URL is not set");
  }
  return siteUrl.replace(/\/$/, "");
}

/**
 * Create a Stripe Checkout Session for either:
 *   - a credit pack purchase (`packIndex` into `gameConfig.creditPacks`), or
 *   - the cash remainder of a Buy It Now order (`orderId`, from
 *     `orders.startPurchase`).
 *
 * Returns the hosted Checkout `url` for the client to redirect to.
 */
export const createCheckoutSession = action({
  args: {
    packIndex: v.optional(v.number()),
    orderId: v.optional(v.id("orders")),
  },
  handler: async (ctx, args) => {
    if (
      (args.packIndex === undefined) === (args.orderId === undefined)
    ) {
      throw new ConvexError(
        "Exactly one of packIndex or orderId must be provided"
      );
    }

    const user = await ctx.runQuery(internal.stripe_helpers.getCallerUser, {});
    if (!user) {
      throw new ConvexError("NOT_AUTHENTICATED");
    }

    const siteUrl = getSiteUrl();
    const stripe = getStripeClient();

    if (args.packIndex !== undefined) {
      const config = await ctx.runQuery(internal.stripe_helpers.getConfigInternal, {});
      const pack = config.creditPacks[args.packIndex];
      if (!pack) {
        throw new ConvexError("Invalid credit pack index");
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        client_reference_id: user._id,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: pack.priceCents,
              product_data: {
                name: `${pack.credits} OneShirt credits`,
                description: "Store credit — redeemable toward shirts.",
              },
            },
          },
        ],
        metadata: {
          kind: "credits",
          packIndex: String(args.packIndex),
          userId: user._id,
        },
        success_url: `${siteUrl}/wallet?purchase=success`,
        cancel_url: `${siteUrl}/wallet?purchase=canceled`,
      });

      if (!session.url) {
        throw new ConvexError("Stripe did not return a checkout URL");
      }
      return { url: session.url };
    }

    // Order remainder checkout.
    const order = await ctx.runQuery(internal.stripe_helpers.getOrderForCheckout, {
      orderId: args.orderId!,
    });
    if (!order || order.userId !== user._id) {
      throw new ConvexError("ORDER_NOT_FOUND");
    }
    if (order.stripeCentsCharged <= 0) {
      throw new ConvexError("Order has no cash remainder to charge");
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: user._id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: order.stripeCentsCharged,
            product_data: {
              name: `OneShirt order — ${order.shirtName}`,
            },
          },
        },
      ],
      metadata: {
        kind: "order",
        orderId: args.orderId!,
        userId: user._id,
      },
      success_url: `${siteUrl}/orders?purchase=success`,
      cancel_url: `${siteUrl}/orders?purchase=canceled`,
    });

    if (!session.url) {
      throw new ConvexError("Stripe did not return a checkout URL");
    }
    return { url: session.url };
  },
});
