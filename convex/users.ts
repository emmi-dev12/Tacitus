import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const BASE64_RE = /^[A-Za-z0-9+/]{43}=$/;
const BASE64_GENERAL_RE = /^[A-Za-z0-9+/]+=*$/;

export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) return null;
    return {
      pbkdf2Salt: profile.pbkdf2Salt,
      encryptedSentinel: profile.encryptedSentinel,
      sentinelIv: profile.sentinelIv,
    };
  },
});

// Keep backward-compat query name for CLI
export const getSalt = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    return profile?.pbkdf2Salt ?? null;
  },
});

export const setProfile = mutation({
  args: {
    pbkdf2Salt: v.string(),
    encryptedSentinel: v.string(),
    sentinelIv: v.string(),
  },
  handler: async (ctx, { pbkdf2Salt, encryptedSentinel, sentinelIv }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    if (!BASE64_RE.test(pbkdf2Salt)) throw new Error("Invalid salt format");
    if (!BASE64_GENERAL_RE.test(encryptedSentinel)) throw new Error("Invalid sentinel format");
    if (!BASE64_GENERAL_RE.test(sentinelIv)) throw new Error("Invalid sentinelIv format");

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existing) throw new Error("Profile already set");

    await ctx.db.insert("userProfiles", {
      userId,
      pbkdf2Salt,
      encryptedSentinel,
      sentinelIv,
    });
  },
});
