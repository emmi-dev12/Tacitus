import { internalMutation } from "./_generated/server";
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

export const deleteExpiredAliases = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    // Use the expiresAt index — O(log n) lookup, not a full table scan
    const expired = await ctx.db
      .query("aliases")
      .withIndex("by_expiresAt", (q) => q.lte("expiresAt", now))
      .collect();

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

const crons = cronJobs();
crons.daily(
  "delete expired aliases",
  { hourUTC: 2, minuteUTC: 0 },
  internal.cleanup.deleteExpiredAliases,
);
export default crons;
