import { httpRouter } from "convex/server";
import { Webhook } from "svix";
import Stripe from "stripe";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

type ClerkEmailAddress = {
  id: string;
  email_address: string;
};

type ClerkUserData = {
  id: string;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string | null;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
};

type ClerkWebhookEvent =
  | { type: "user.created"; data: ClerkUserData }
  | { type: "user.updated"; data: ClerkUserData }
  | { type: "user.deleted"; data: { id: string; deleted: boolean } }
  | { type: string; data: unknown };

function primaryEmail(data: ClerkUserData): string {
  const match = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id
  );
  return match?.email_address ?? data.email_addresses[0]?.email_address ?? "";
}

function displayName(data: ClerkUserData): string {
  const name = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();
  return name || primaryEmail(data);
}

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return new Response("Missing CLERK_WEBHOOK_SECRET", { status: 500 });
    }

    const payload = await request.text();
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    const wh = new Webhook(webhookSecret);
    let event: ClerkWebhookEvent;
    try {
      event = wh.verify(payload, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as ClerkWebhookEvent;
    } catch {
      return new Response("Invalid signature", { status: 400 });
    }

    switch (event.type) {
      case "user.created":
      case "user.updated": {
        const data = event.data as ClerkUserData;
        await ctx.runMutation(internal.users.upsertFromClerk, {
          clerkId: data.id,
          email: primaryEmail(data),
          name: displayName(data),
          avatarUrl: data.image_url ?? undefined,
        });
        break;
      }
      case "user.deleted": {
        // No destructive action in v1 — retain history, just no-op.
        break;
      }
      default:
        break;
    }

    return new Response(null, { status: 200 });
  }),
});

/**
 * Stripe webhook: verifies the signature, then handles
 * `checkout.session.completed` for both credit-pack purchases (fulfill
 * via `stripe_helpers.fulfillPack`, idempotent on the payment intent) and
 * Buy-It-Now order remainders (finalize the order -> schedule Printify
 * submission).
 */
http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!webhookSecret || !secretKey) {
      return new Response("NOT_CONFIGURED: Stripe env vars missing", { status: 500 });
    }

    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing stripe-signature header", { status: 400 });
    }

    const payload = await request.text();
    const stripe = new Stripe(secretKey);

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        payload,
        signature,
        webhookSecret
      );
    } catch {
      return new Response("Invalid signature", { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata ?? {};
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id;

      if (!paymentIntentId) {
        return new Response("Missing payment_intent on session", { status: 400 });
      }

      if (metadata.kind === "credits") {
        const userId = metadata.userId;
        const packIndex = Number(metadata.packIndex);
        if (!userId || Number.isNaN(packIndex)) {
          return new Response("Missing credits metadata", { status: 400 });
        }
        await ctx.runMutation(internal.stripe_helpers.fulfillPack, {
          userId: userId as never,
          packIndex,
          stripePaymentIntentId: paymentIntentId,
        });
      } else if (metadata.kind === "order") {
        const orderId = metadata.orderId;
        if (!orderId) {
          return new Response("Missing order metadata", { status: 400 });
        }
        await ctx.runMutation(internal.orders.finalizePurchase, {
          orderId: orderId as never,
          stripePaymentIntentId: paymentIntentId,
        });
      }
    }

    return new Response(null, { status: 200 });
  }),
});

/**
 * Printify webhook: `order:updated` (and `order:sent-to-production`) ->
 * map Printify status to ours, capture tracking, notify the user on
 * shipped/delivered. Verifies the shared-secret HMAC signature when
 * `PRINTIFY_WEBHOOK_SECRET` is configured (Printify signs webhook bodies
 * with HMAC-SHA256, sent in the `X-Pfy-Signature` header).
 */
http.route({
  path: "/printify-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payload = await request.text();
    const webhookSecret = process.env.PRINTIFY_WEBHOOK_SECRET;

    if (webhookSecret) {
      const signatureHeader = request.headers.get("x-pfy-signature");
      if (!signatureHeader) {
        return new Response("Missing X-Pfy-Signature header", { status: 400 });
      }
      const valid = await verifyHmacSha256(payload, webhookSecret, signatureHeader);
      if (!valid) {
        return new Response("Invalid signature", { status: 400 });
      }
    }

    let event: {
      type: string;
      resource?: { id?: string; type?: string };
      data?: {
        id?: string;
        external_id?: string;
        status?: string;
        shipments?: { tracking_number?: string; tracking_url?: string; carrier?: string }[];
      };
    };
    try {
      event = JSON.parse(payload);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (event.type === "order:updated" || event.type === "order:sent-to-production") {
      const printifyOrderId = event.data?.id ?? event.resource?.id;
      const externalId = event.data?.external_id;
      const status = event.data?.status;
      const shipment = event.data?.shipments?.[0];

      if ((printifyOrderId || externalId) && status) {
        await ctx.runMutation(internal.printify_webhook.applyWebhookUpdate, {
          printifyOrderId,
          externalId,
          printifyStatus: status,
          trackingNumber: shipment?.tracking_number,
          trackingUrl: shipment?.tracking_url,
          carrier: shipment?.carrier,
        });
      }
    }

    return new Response(null, { status: 200 });
  }),
});

/** HMAC-SHA256 verification using Web Crypto (no Node "crypto" module). */
async function verifyHmacSha256(
  payload: string,
  secret: string,
  signatureHex: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const computedHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Constant-time-ish comparison.
  if (computedHex.length !== signatureHex.length) return false;
  let diff = 0;
  for (let i = 0; i < computedHex.length; i++) {
    diff |= computedHex.charCodeAt(i) ^ signatureHex.charCodeAt(i);
  }
  return diff === 0;
}

export default http;
