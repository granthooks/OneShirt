import { internalQuery } from "./_generated/server";
import { getUserOrNull } from "./lib/auth";

/** Internal query helper for `convex/generation.ts` (Node-runtime action). */
export const getCallerAdmin = internalQuery({
  args: {},
  handler: async (ctx) => {
    const user = await getUserOrNull(ctx);
    if (!user || user.role !== "admin") return null;
    return user;
  },
});
