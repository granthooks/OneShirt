import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { requireUser } from "./lib/auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query("addresses")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
  },
});

const addressFields = {
  firstName: v.string(),
  lastName: v.string(),
  address1: v.string(),
  address2: v.optional(v.string()),
  city: v.string(),
  region: v.string(),
  zip: v.string(),
  country: v.string(),
  phone: v.optional(v.string()),
  isDefault: v.optional(v.boolean()),
};

export const upsert = mutation({
  args: {
    addressId: v.optional(v.id("addresses")),
    ...addressFields,
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const { addressId, isDefault, ...fields } = args;

    if (addressId) {
      const existing = await ctx.db.get(addressId);
      if (!existing || existing.userId !== user._id) {
        throw new ConvexError("ADDRESS_NOT_FOUND");
      }
      if (isDefault) {
        await clearOtherDefaults(ctx, user._id, addressId);
      }
      await ctx.db.patch(addressId, {
        ...fields,
        isDefault: isDefault ?? existing.isDefault,
      });
      return addressId;
    }

    const shouldBeDefault = isDefault ?? false;
    const newId = await ctx.db.insert("addresses", {
      userId: user._id,
      ...fields,
      isDefault: shouldBeDefault,
    });
    if (shouldBeDefault) {
      await clearOtherDefaults(ctx, user._id, newId);
    }
    return newId;
  },
});

export const remove = mutation({
  args: { addressId: v.id("addresses") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const existing = await ctx.db.get(args.addressId);
    if (!existing || existing.userId !== user._id) {
      throw new ConvexError("ADDRESS_NOT_FOUND");
    }
    await ctx.db.delete(args.addressId);
  },
});

export const setDefault = mutation({
  args: { addressId: v.id("addresses") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const existing = await ctx.db.get(args.addressId);
    if (!existing || existing.userId !== user._id) {
      throw new ConvexError("ADDRESS_NOT_FOUND");
    }
    await clearOtherDefaults(ctx, user._id, args.addressId);
    await ctx.db.patch(args.addressId, { isDefault: true });
  },
});

async function clearOtherDefaults(
  ctx: MutationCtx,
  userId: Id<"users">,
  keepId: Id<"addresses">
) {
  const others = await ctx.db
    .query("addresses")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  for (const addr of others) {
    if (addr._id !== keepId && addr.isDefault) {
      await ctx.db.patch(addr._id, { isDefault: false });
    }
  }
}
