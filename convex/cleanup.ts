import { internalMutation } from "./_generated/server";

export const deleteExpiredAliases = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    // Use the expiresAt index — O(log n) lookup, not a full table scan
    const expired = await ctx.db
      .query("aliases")
      .withIndex("by_expiresAt", (q) => q.lte("expiresAt", now))
      .collect();

    // Note: this cron cannot delete mail.tm accounts because the tokens are
    // E2E-encrypted and the server never has the decryption key. Client-initiated
    // alias deletion (AliasCard.handleDelete) calls deleteMailTmAccount before
    // removing the Convex record. TTL-expired aliases that were never manually
    // deleted leave orphaned mail.tm accounts; mail.tm garbage-collects inactive
    // accounts on its own schedule.
    for (const alias of expired) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_aliasId", (q) => q.eq("aliasId", alias._id))
        .collect();
      await Promise.all(messages.map((m) => ctx.db.delete(m._id)));
      await ctx.db.delete(alias._id);
    }
  },
});
