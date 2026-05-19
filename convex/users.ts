import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// SALT_BYTES = 32 → base64 = 43 data chars + 1 padding char = 44 total
// If SALT_BYTES changes, update this regex accordingly.
const BASE64_RE = /^[A-Za-z0-9+/]{43}=$/ ;
const BASE64_GENERAL_RE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/;

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

    if (pbkdf2Salt.length !== 44 || !BASE64_RE.test(pbkdf2Salt)) throw new Error("Invalid salt format");
    if (encryptedSentinel.length > 256 || !BASE64_GENERAL_RE.test(encryptedSentinel)) throw new Error("Invalid sentinel format");
    // sentinelIv is a 12-byte AES-GCM IV = 16 base64 chars, no padding (12 % 3 = 0)
    if (sentinelIv.length !== 16 || !/^[A-Za-z0-9+/]{16}$/.test(sentinelIv)) throw new Error("Invalid sentinelIv format");

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    // Profile is set once — changing it requires resetProfile (which destroys all data)
    if (existing) throw new Error("Profile already set. Use resetProfile to start fresh.");

    await ctx.db.insert("userProfiles", {
      userId,
      pbkdf2Salt,
      encryptedSentinel,
      sentinelIv,
    });
  },
});

// Destroys ALL user data (aliases, messages, profile) and allows fresh setup.
// This is the only recovery path if both passphrase and recovery code are lost.
export const resetProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    // Delete all aliases and cascade-delete messages
    const aliases = await ctx.db
      .query("aliases")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const alias of aliases) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_aliasId", (q) => q.eq("aliasId", alias._id))
        .collect();
      await Promise.all(messages.map((m) => ctx.db.delete(m._id)));
      await ctx.db.delete(alias._id);
    }

    // Delete profile
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (profile) await ctx.db.delete(profile._id);
  },
});
