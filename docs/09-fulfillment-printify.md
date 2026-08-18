# 09 — Fulfillment (Printify)

## Account & product baseline

- Personal Access Token (self-serve, no approval needed) + shop id → Convex env (`PRINTIFY_API_TOKEN`, `PRINTIFY_SHOP_ID`).
- Standard garment: **Bella+Canvas 3001** (blueprint 12), one vetted US print provider chosen in the dashboard (record its `printProviderId` in `gameConfig` or per shirt). Base cost ~$9–11 + ~$4–5 US shipping → ~$15 landed = `prizeCostCents` default 1500.
- v1 sells **one color** (e.g. black or white per design, chosen at shirt creation) across sizes S–3XL. Variants map size → Printify `variant_id`; store the mapping per shirt after product creation.

## Product creation (lazy, on first order per shirt)

`printify.ensureProduct(shirtId)` action:
1. If `shirts.printify.productId` exists → done.
2. `POST /v1/uploads/images.json` with the print master's Convex storage URL → `image_id`.
3. `POST /v1/shops/{shop}/products.json`: blueprint 12, provider, enabled size variants, print area placement (front, centered, scale ~0.9).
4. Save `productId` + variant map on the shirt.

(Products are never published to a sales channel — API orders don't require it.)

## Order submission (`printify.submitOrder({orderId})` action)

1. Load order; require status `submitting`; idempotency: if `printifyOrderId` already set, skip to status sync.
2. `ensureProduct` for the shirt; resolve `variant_id` from order size.
3. `POST /v1/shops/{shop}/orders.json`:
   ```json
   {
     "external_id": "<convex orderId>",
     "line_items": [{"product_id": "...", "variant_id": N, "quantity": 1}],
     "address_to": { ...order.addressSnapshot, "email": user.email }
   }
   ```
4. Save `printifyOrderId`; status → `in_production` (with auto-approval on in Printify settings; in dev, leave manual approval on).
5. Failure → status `failed`, admin notification with the API error, user NOT notified of failure details. Admin can `resubmitOrder`.

## Prize orders — missing info flow

If the winner has no size or address at draw time, the order sits in `pending_info`; the win screen and a persistent banner walk them through providing it (`orders.provideInfo({orderId, size, addressId})` → status `submitting` → schedule submission). Remind at 24h/72h; admin sees stale `pending_info` orders.

## Webhooks

Register `order:updated` (and `order:sent-to-production`) pointing to `POST /printify-webhook`. Handler: verify secret, look up order by `printifyOrderId` (fallback `external_id`), map Printify status → ours, capture `shipments[].tracking_number/url/carrier`, notify the user on `shipped` (with tracking link) and `delivered`. Daily reconciliation cron backstops missed webhooks ([05-backend-functions.md](05-backend-functions.md)).

## Status mapping

| Printify | Ours |
|---|---|
| pending / on-hold | in_production (submitted) |
| in-production / sending-to-production | in_production |
| fulfilled / shipped (shipment present) | shipped |
| delivered | delivered |
| canceled / payment-not-received | failed (admin alert) |

## Cost control

- Admin economics page shows actual Printify charges (from order payloads) vs `prizeCostCents` estimates.
- Consider Printify Premium ($29/mo, ~20% off base) once volume > ~15 shirts/mo — note in admin docs, not automated.
