import { internalMutation } from "./_generated/server";

export const deleteExpiredAliases = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    // Use the expiresAt index — O(log n) lookup, not a full table scan
    // Process up to 500 expired aliases per run to stay within Convex read budget.
    // If more exist, the next scheduled run will catch them.
    // Note: orphaned mail.tm accounts are intentional — tokens are E2E-encrypted
    // so the server can never call the mail.tm delete API. mail.tm GC handles them.
    const expired = await ctx.db
      .query("aliases")
      .withIndex("by_expiresAt", (q) => q.lte("expiresAt", now))
      .take(500);

    for (const alias of expired) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_aliasId", (q) => q.eq("aliasId", alias._id))
        .take(500);
      await Promise.all(messages.map((m) => ctx.db.delete(m._id)));
      await ctx.db.delete(alias._id);
    }
  },
});
