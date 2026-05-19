import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const MAX_ENCRYPTED_FIELD = 1024 * 512; // 512 KB
const MAX_MSG_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const BASE64_RE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/;

function validateBase64Field(value: string, name: string) {
  if (value.length > MAX_ENCRYPTED_FIELD) throw new Error(`${name} exceeds maximum size`);
  if (!BASE64_RE.test(value)) throw new Error(`${name} is not valid base64`);
}

function validateIv(value: string, name: string) {
  // 12 bytes base64 = exactly 16 chars, no padding (12 % 3 = 0)
  if (value.length !== 16 || !/^[A-Za-z0-9+/]{16}$/.test(value)) throw new Error(`${name} is not a valid IV`);
}

export const listMessages = query({
  args: { aliasId: v.id("aliases") },
  handler: async (ctx, { aliasId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const alias = await ctx.db.get(aliasId);
    if (!alias || alias.userId !== userId) return [];
    return ctx.db
      .query("messages")
      .withIndex("by_aliasId", (q) => q.eq("aliasId", aliasId))
      .order("desc")
      .collect();
  },
});

export const upsertMessage = mutation({
  args: {
    aliasId: v.id("aliases"),
    mailTmId: v.string(),
    encryptedFrom: v.string(),
    ivFrom: v.string(),
    encryptedSubject: v.string(),
    ivSubject: v.string(),
    encryptedBodyPlain: v.string(),
    ivBodyPlain: v.string(),
    encryptedBodyHtml: v.string(),
    ivBodyHtml: v.string(),
    receivedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const alias = await ctx.db.get(args.aliasId);
    if (!alias || alias.userId !== userId) throw new Error("Not found");

    if (args.mailTmId.length > 128) throw new Error("Invalid mailTmId");
    if (!/^[A-Za-z0-9_\-]+$/.test(args.mailTmId)) throw new Error("Invalid mailTmId format");

    const now = Date.now();
    if (args.receivedAt > now + 60_000) throw new Error("receivedAt in future");
    if (args.receivedAt < now - MAX_MSG_AGE_MS) throw new Error("receivedAt too old");

    validateBase64Field(args.encryptedFrom, "from");
    validateIv(args.ivFrom, "ivFrom");
    validateBase64Field(args.encryptedSubject, "subject");
    validateIv(args.ivSubject, "ivSubject");
    validateBase64Field(args.encryptedBodyPlain, "bodyPlain");
    validateIv(args.ivBodyPlain, "ivBodyPlain");
    validateBase64Field(args.encryptedBodyHtml, "bodyHtml");
    validateIv(args.ivBodyHtml, "ivBodyHtml");

    // Dedup per alias — fix #6: query scoped to aliasId + mailTmId
    const existing = await ctx.db
      .query("messages")
      .withIndex("by_aliasId_and_mailTmId", (q) =>
        q.eq("aliasId", args.aliasId).eq("mailTmId", args.mailTmId),
      )
      .unique();
    if (existing) return existing._id;

    return ctx.db.insert("messages", { ...args, read: false });
  },
});

export const markRead = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const message = await ctx.db.get(messageId);
    if (!message) throw new Error("Not found");
    const alias = await ctx.db.get(message.aliasId);
    if (!alias || alias.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(messageId, { read: true });
  },
});

export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const message = await ctx.db.get(messageId);
    if (!message) throw new Error("Not found");
    const alias = await ctx.db.get(message.aliasId);
    if (!alias || alias.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(messageId);
  },
});
