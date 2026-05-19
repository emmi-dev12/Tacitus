import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const ALIAS_RATE_LIMIT = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_LABEL_LENGTH = 64;
const MAX_ADDRESS_LENGTH = 254;
const BASE64_RE = /^[A-Za-z0-9+/]+=*$/;

function validateLabel(label: string) {
  if (label.length === 0 || label.length > MAX_LABEL_LENGTH) {
    throw new Error("Label must be 1–64 characters");
  }
  // ASCII only — no Unicode surprises for downstream systems
  if (!/^[\x20-\x7E]+$/.test(label)) throw new Error("Label must be printable ASCII");
}

function validateAddress(address: string) {
  if (address.length > MAX_ADDRESS_LENGTH) throw new Error("Address too long");
  // Strict RFC 5321-compatible local-part + hostname pattern
  const EMAIL_RE = /^[a-zA-Z0-9][a-zA-Z0-9.+\-_]{0,62}@[a-zA-Z0-9][a-zA-Z0-9.\-]{1,253}\.[a-zA-Z]{2,}$/;
  if (!EMAIL_RE.test(address)) throw new Error("Invalid email address format");
}

export const listAliases = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db
      .query("aliases")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const createAlias = mutation({
  args: {
    address: v.string(),
    label: v.string(),
    mailTmAccountId: v.string(),
    encryptedMailTmToken: v.string(),
    encryptedMailTmPassword: v.string(),
    tokenIv: v.string(),
    passwordIv: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    validateLabel(args.label);
    validateAddress(args.address);

    if (args.mailTmAccountId.length > 128) throw new Error("Invalid accountId");
    if (args.encryptedMailTmToken.length > 2048) throw new Error("Token too long");
    if (args.encryptedMailTmPassword.length > 2048) throw new Error("Password too long");
    if (!BASE64_RE.test(args.tokenIv)) throw new Error("Invalid tokenIv");
    if (!BASE64_RE.test(args.passwordIv)) throw new Error("Invalid passwordIv");

    const windowStart = Date.now() - RATE_LIMIT_WINDOW_MS;
    const recentAliases = await ctx.db
      .query("aliases")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.gte(q.field("_creationTime"), windowStart))
      .collect();

    if (recentAliases.length >= ALIAS_RATE_LIMIT) {
      throw new Error("Rate limit: max 10 aliases per hour");
    }

    const existing = await ctx.db
      .query("aliases")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .unique();
    if (existing) throw new Error("Address already registered");

    return ctx.db.insert("aliases", {
      userId,
      address: args.address,
      label: args.label,
      activeStatus: true,
      mailTmAccountId: args.mailTmAccountId,
      encryptedMailTmToken: args.encryptedMailTmToken,
      encryptedMailTmPassword: args.encryptedMailTmPassword,
      tokenIv: args.tokenIv,
      passwordIv: args.passwordIv,
      expiresAt: Date.now() + DEFAULT_TTL_MS,
    });
  },
});

export const deleteAlias = mutation({
  args: { aliasId: v.id("aliases") },
  handler: async (ctx, { aliasId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const alias = await ctx.db.get(aliasId);
    if (!alias || alias.userId !== userId) throw new Error("Not found");

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_aliasId", (q) => q.eq("aliasId", aliasId))
      .collect();
    await Promise.all(messages.map((m) => ctx.db.delete(m._id)));
    await ctx.db.delete(aliasId);
  },
});

export const setActiveStatus = mutation({
  args: { aliasId: v.id("aliases"), activeStatus: v.boolean() },
  handler: async (ctx, { aliasId, activeStatus }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const alias = await ctx.db.get(aliasId);
    if (!alias || alias.userId !== userId) throw new Error("Not found");

    await ctx.db.patch(aliasId, { activeStatus });
  },
});
