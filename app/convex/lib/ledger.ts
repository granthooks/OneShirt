import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export const ledgerKindValidator = v.union(
  v.literal("purchase"),
  v.literal("welcome"),
  v.literal("referral"),
  v.literal("streak"),
  v.literal("stake"),
  v.literal("unstake"),
  v.literal("expiry_refund"),
  v.literal("redeem"),
  v.literal("admin_adjust")
);

export type LedgerKind =
  | "purchase"
  | "welcome"
  | "referral"
  | "streak"
  | "stake"
  | "unstake"
  | "expiry_refund"
  | "redeem"
  | "admin_adjust";

export type PostLedgerArgs = {
  userId: Id<"users">;
  delta: number;
  kind: LedgerKind;
  shirtId?: Id<"shirts">;
  orderId?: Id<"orders">;
  stripePaymentIntentId?: string;
  note?: string;
};

/**
 * The ONLY code path that writes to `creditLedger`. Inserts the
 * append-only ledger row and updates the caller's cached
 * `availableCredits` / `stakedCredits` on the `users` row in the same
 * mutation, per the invariant in 04-data-model.md.
 *
 * Semantics of `delta` (the available-balance effect) by kind:
 *   - purchase / welcome / referral / streak / admin_adjust: available += delta
 *   - stake:            available -= |delta|, staked += |delta|
 *   - unstake / expiry_refund: available += |delta|, staked -= |delta|
 *   - redeem:           available -= |delta|
 */
export async function postLedger(
  ctx: MutationCtx,
  args: PostLedgerArgs
): Promise<Id<"creditLedger">> {
  const user = await ctx.db.get(args.userId);
  if (!user) {
    throw new ConvexError("USER_NOT_FOUND");
  }

  const magnitude = Math.abs(args.delta);
  let availableCredits = user.availableCredits;
  let stakedCredits = user.stakedCredits;

  switch (args.kind) {
    case "stake": {
      availableCredits -= magnitude;
      stakedCredits += magnitude;
      break;
    }
    case "unstake":
    case "expiry_refund": {
      availableCredits += magnitude;
      stakedCredits -= magnitude;
      break;
    }
    case "redeem": {
      availableCredits -= magnitude;
      break;
    }
    case "purchase":
    case "welcome":
    case "referral":
    case "streak":
    case "admin_adjust": {
      availableCredits += args.delta;
      break;
    }
    default: {
      const _exhaustive: never = args.kind;
      throw new ConvexError(`UNKNOWN_LEDGER_KIND: ${String(_exhaustive)}`);
    }
  }

  await ctx.db.patch(args.userId, {
    availableCredits,
    stakedCredits,
  });

  const ledgerId = await ctx.db.insert("creditLedger", {
    userId: args.userId,
    delta: args.delta,
    kind: args.kind,
    shirtId: args.shirtId,
    orderId: args.orderId,
    stripePaymentIntentId: args.stripePaymentIntentId,
    note: args.note,
    createdAt: Date.now(),
  });

  return ledgerId;
}
