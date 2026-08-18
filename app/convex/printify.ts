"use node";

import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const PRINTIFY_API_BASE = "https://api.printify.com/v1";

function getPrintifyEnv(): { token: string; shopId: string } {
  const token = process.env.PRINTIFY_API_TOKEN;
  const shopId = process.env.PRINTIFY_SHOP_ID;
  if (!token) {
    throw new ConvexError("NOT_CONFIGURED: PRINTIFY_API_TOKEN is not set");
  }
  if (!shopId) {
    throw new ConvexError("NOT_CONFIGURED: PRINTIFY_SHOP_ID is not set");
  }
  return { token, shopId };
}

async function printifyFetch(
  token: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(`${PRINTIFY_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  return res;
}

/**
 * Ensure the shirt has a Printify product (lazy, on first order). Uploads
 * the print master image and creates a product with the shirt's (or
 * config default) blueprint/provider, one print area, all size variants
 * enabled. Saves `productId` + size->variant map on the shirt.
 */
async function ensureProduct(
  ctx: ActionCtx,
  token: string,
  shopId: string,
  shirt: {
    _id: Id<"shirts">;
    name: string;
    printMasterId?: Id<"_storage">;
    printify?: {
      blueprintId: number;
      printProviderId: number;
      productId?: string;
      variants?: Record<string, number>;
    };
  },
  blueprintId: number,
  printProviderId: number
): Promise<{ productId: string; variants: Record<string, number> }> {
  if (shirt.printify?.productId && shirt.printify.variants) {
    return {
      productId: shirt.printify.productId,
      variants: shirt.printify.variants,
    };
  }

  if (!shirt.printMasterId) {
    throw new ConvexError("Shirt has no print master image — cannot create Printify product");
  }

  const printMasterUrl: string | null = await ctx.runQuery(
    internal.printify_helpers.getStorageUrl,
    { storageId: shirt.printMasterId }
  );
  if (!printMasterUrl) {
    throw new ConvexError("Could not resolve print master storage URL");
  }

  // 1. Upload image.
  const uploadRes = await printifyFetch(token, `/uploads/images.json`, {
    method: "POST",
    body: JSON.stringify({
      file_name: `${shirt._id}-print-master.png`,
      url: printMasterUrl,
    }),
  });
  if (!uploadRes.ok) {
    const body = await uploadRes.text();
    throw new ConvexError(`Printify image upload failed: ${uploadRes.status} ${body}`);
  }
  const uploadJson = (await uploadRes.json()) as { id: string };
  const imageId = uploadJson.id;

  // 2. Fetch the blueprint's print provider variants so we can enable all
  // sizes and map size -> variant_id.
  const variantsRes = await printifyFetch(
    token,
    `/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/variants.json`
  );
  if (!variantsRes.ok) {
    const body = await variantsRes.text();
    throw new ConvexError(`Printify variants fetch failed: ${variantsRes.status} ${body}`);
  }
  const variantsJson = (await variantsRes.json()) as {
    variants: { id: number; title: string; options?: { size?: string } }[];
  };

  const sizeToVariant: Record<string, number> = {};
  for (const variant of variantsJson.variants) {
    // Titles look like "Black / S", "Black / 2XL", etc; options.size is
    // more reliable when present.
    const size = variant.options?.size ?? variant.title.split("/").pop()?.trim();
    if (size && !(size in sizeToVariant)) {
      sizeToVariant[size] = variant.id;
    }
  }

  const variantIds = Object.values(sizeToVariant);
  if (variantIds.length === 0) {
    throw new ConvexError("No Printify variants found for blueprint/provider");
  }

  // 3. Create the product (never published to a sales channel).
  const productRes = await printifyFetch(token, `/shops/${shopId}/products.json`, {
    method: "POST",
    body: JSON.stringify({
      title: shirt.name,
      description: shirt.name,
      blueprint_id: blueprintId,
      print_provider_id: printProviderId,
      variants: variantIds.map((id) => ({ id, price: 0, is_enabled: true })),
      print_areas: [
        {
          variant_ids: variantIds,
          placeholders: [
            {
              position: "front",
              images: [
                {
                  id: imageId,
                  x: 0.5,
                  y: 0.5,
                  scale: 0.9,
                  angle: 0,
                },
              ],
            },
          ],
        },
      ],
    }),
  });
  if (!productRes.ok) {
    const body = await productRes.text();
    throw new ConvexError(`Printify product creation failed: ${productRes.status} ${body}`);
  }
  const productJson = (await productRes.json()) as { id: string };

  await ctx.runMutation(internal.printify_helpers.saveProductInfo, {
    shirtId: shirt._id,
    productId: productJson.id,
    blueprintId,
    printProviderId,
    variants: sizeToVariant,
  });

  return { productId: productJson.id, variants: sizeToVariant };
}

/**
 * Submit a Convex order to Printify. Idempotent: if `printifyOrderId` is
 * already set, this is a no-op. On any failure, the order is marked
 * `failed` and every admin is notified (never silent) — the admin can
 * retry via `admin.resubmitOrder`.
 */
export const submitOrder = internalAction({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const { token, shopId } = getPrintifyEnv();

    const data = await ctx.runQuery(internal.printify_helpers.getOrderForSubmission, {
      orderId: args.orderId,
    });
    if (!data) {
      throw new ConvexError("ORDER_NOT_FOUND");
    }
    const { order, shirt, user, config } = data;

    if (order.printifyOrderId) {
      // Already submitted — nothing to do (idempotent).
      return { skipped: true as const };
    }
    if (order.status !== "submitting") {
      throw new ConvexError(`Order is not in "submitting" status (was ${order.status})`);
    }

    const blueprintId = shirt.printify?.blueprintId ?? config.printifyDefaults?.blueprintId;
    const printProviderId =
      shirt.printify?.printProviderId ?? config.printifyDefaults?.printProviderId;

    if (!blueprintId || !printProviderId) {
      await ctx.runMutation(internal.printify_helpers.markOrderFailed, {
        orderId: args.orderId,
        errorMessage:
          "NOT_CONFIGURED: no Printify blueprint/print provider set for this shirt or in gameConfig.printifyDefaults",
      });
      return { failed: true as const };
    }

    try {
      const { variants } = await ensureProduct(
        ctx,
        token,
        shopId,
        shirt,
        blueprintId,
        printProviderId
      );

      const variantId = variants[order.size];
      if (!variantId) {
        throw new ConvexError(`No Printify variant for size "${order.size}"`);
      }
      // Re-read productId (ensureProduct may have just created it).
      const refreshedShirt = await ctx.runQuery(internal.printify_helpers.getShirtPrintify, {
        shirtId: shirt._id,
      });
      const productId = refreshedShirt?.productId;
      if (!productId) {
        throw new ConvexError("Printify product id missing after ensureProduct");
      }

      const orderRes = await printifyFetch(token, `/shops/${shopId}/orders.json`, {
        method: "POST",
        body: JSON.stringify({
          external_id: order._id,
          line_items: [{ product_id: productId, variant_id: variantId, quantity: 1 }],
          address_to: {
            first_name: order.addressSnapshot.firstName,
            last_name: order.addressSnapshot.lastName,
            address1: order.addressSnapshot.address1,
            address2: order.addressSnapshot.address2 ?? "",
            city: order.addressSnapshot.city,
            region: order.addressSnapshot.region,
            zip: order.addressSnapshot.zip,
            country: order.addressSnapshot.country,
            phone: order.addressSnapshot.phone ?? "",
            email: user.email,
          },
        }),
      });

      if (!orderRes.ok) {
        const body = await orderRes.text();
        throw new ConvexError(`Printify order submission failed: ${orderRes.status} ${body}`);
      }

      const orderJson = (await orderRes.json()) as { id: string };

      await ctx.runMutation(internal.printify_helpers.markOrderSubmitted, {
        orderId: args.orderId,
        printifyOrderId: orderJson.id,
      });

      return { success: true as const, printifyOrderId: orderJson.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.printify_helpers.markOrderFailed, {
        orderId: args.orderId,
        errorMessage: message,
      });
      return { failed: true as const, error: message };
    }
  },
});

const STALE_ORDER_THRESHOLD_MS = 20 * 60 * 60 * 1000; // 20 hours

const PRINTIFY_STATUS_MAP: Record<string, "in_production" | "shipped" | "delivered" | "failed"> = {
  pending: "in_production",
  "on-hold": "in_production",
  "in-production": "in_production",
  "sending-to-production": "in_production",
  fulfilled: "shipped",
  shipped: "shipped",
  delivered: "delivered",
  canceled: "failed",
  "payment-not-received": "failed",
};

/**
 * Daily reconciliation: poll Printify for orders in `submitting` /
 * `in_production` whose `updatedAt` is stale (webhook backstop), per
 * docs/09-fulfillment-printify.md status mapping. Also auto-cancels
 * purchase orders that have sat unpaid (`pending_info`) for 24h+,
 * restoring any redeemed credits.
 */
export const reconcile = internalAction({
  args: {},
  handler: async (ctx) => {
    const { token, shopId } = getPrintifyEnv();
    const now = Date.now();

    const staleOrders = await ctx.runQuery(internal.printify_helpers.getStaleOrders, {
      cutoff: now - STALE_ORDER_THRESHOLD_MS,
    });

    for (const order of staleOrders) {
      if (!order.printifyOrderId) continue;
      try {
        const res = await printifyFetch(
          token,
          `/shops/${shopId}/orders/${order.printifyOrderId}.json`
        );
        if (!res.ok) continue;
        const json = (await res.json()) as {
          status: string;
          shipments?: { tracking_number?: string; tracking_url?: string; carrier?: string }[];
        };
        const mapped = PRINTIFY_STATUS_MAP[json.status];
        if (!mapped) continue;

        const shipment = json.shipments?.[0];
        await ctx.runMutation(internal.printify_helpers.applyStatusUpdate, {
          orderId: order._id,
          status: mapped,
          trackingNumber: shipment?.tracking_number,
          trackingUrl: shipment?.tracking_url,
          carrier: shipment?.carrier,
        });
      } catch {
        // Best-effort reconciliation — skip this order, try again tomorrow.
        continue;
      }
    }

    const stalePending = await ctx.runQuery(
      internal.printify_helpers.getStalePendingPurchases,
      { cutoff: now - 24 * 60 * 60 * 1000 }
    );
    for (const order of stalePending) {
      await ctx.runMutation(internal.printify_helpers.cancelStalePurchase, {
        orderId: order._id,
      });
    }
  },
});
