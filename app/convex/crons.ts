import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, internalMutation } from "./_generated/server";
import { postLedger } from "./lib/ledger";

const DRAW_WATCHDOG_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Expiry sweep: active shirts past `expiresAt` move to "expired". All
 * staked credits on the shirt return to available (unstake); free-swipe
 * entries just vanish. Entrants are notified.
 */
export const expirySweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("shirts")
      .withIndex("by_status_expiresAt", (q) =>
        q.eq("status", "active").lt("expiresAt", now)
      )
      .collect();

    for (const shirt of expired) {
      const activeEntries = await ctx.db
        .query("entries")
        .withIndex("by_shirtId", (q) => q.eq("shirtId", shirt._id))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

      const paidCountByUser = new Map<string, number>();
      for (const entry of activeEntries) {
        if (entry.source === "paid") {
          const key = entry.userId as unknown as string;
          paidCountByUser.set(key, (paidCountByUser.get(key) ?? 0) + 1);
        }
        await ctx.db.patch(entry._id, { status: "refunded" });
      }

      for (const [userIdStr, count] of paidCountByUser.entries()) {
        await postLedger(ctx, {
          userId: userIdStr as Id<"users">,
          delta: count,
          kind: "expiry_refund",
          shirtId: shirt._id,
          note: `Refunded ${count} entr${count === 1 ? "y" : "ies"} — shirt expired`,
        });
      }

      const distinctUsers = new Set(activeEntries.map((e) => e.userId as unknown as string));
      for (const userIdStr of distinctUsers) {
        await ctx.db.insert("notifications", {
          userId: userIdStr as Id<"users">,
          kind: "expiry_refund",
          title: `${shirt.name} expired`,
          body: `${shirt.name} didn't reach its bid threshold in time, so your credits have been refunded to your available balance.`,
          shirtId: shirt._id,
          read: false,
          emailed: false,
          createdAt: Date.now(),
        });
      }

      await ctx.db.patch(shirt._id, { status: "expired" });
    }
  },
});

/**
 * Draw watchdog: shirts stuck in "drawing" for longer than the threshold
 * (scheduled draw action failed to run/complete) get re-scheduled.
 */
export const drawWatchdog = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - DRAW_WATCHDOG_THRESHOLD_MS;
    const stuck = await ctx.db
      .query("shirts")
      .withIndex("by_status", (q) => q.eq("status", "drawing"))
      .collect();

    for (const shirt of stuck) {
      const drawingAt = shirt.drawingAt ?? 0;
      if (drawingAt < cutoff) {
        await ctx.scheduler.runAfter(0, internal.draws.execute, {
          shirtId: shirt._id,
        });
      }
    }
  },
});

/**
 * Daily order reconciliation: delegates to `printify.reconcile`, which
 * polls Printify for orders in "submitting" / "in_production" with stale
 * `updatedAt` (webhook backstop) and auto-cancels unpaid purchase orders
 * older than 24h.
 */
export const orderReconciliation = internalAction({
  args: {},
  handler: async (ctx) => {
    await ctx.runAction(internal.printify.reconcile, {});
  },
});

const crons = cronJobs();

crons.interval("expiry sweep", { hours: 1 }, internal.crons.expirySweep, {});
crons.interval("draw watchdog", { hours: 1 }, internal.crons.drawWatchdog, {});
crons.interval(
  "order reconciliation",
  { hours: 24 },
  internal.crons.orderReconciliation,
  {}
);

export default crons;
