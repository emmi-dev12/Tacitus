import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  userProfiles: defineTable({
    userId: v.string(),
    pbkdf2Salt: v.string(),
    encryptedSentinel: v.string(), // AES-GCM encrypted "tacitus-v1" — used to verify passphrase
    sentinelIv: v.string(),
  }).index("by_userId", ["userId"]),

  aliases: defineTable({
    userId: v.string(),
    address: v.string(),
    label: v.string(),
    activeStatus: v.boolean(),
    mailTmAccountId: v.string(),
    encryptedMailTmToken: v.string(),
    encryptedMailTmPassword: v.string(), // stored so token can be refreshed
    tokenIv: v.string(),
    passwordIv: v.string(),
    expiresAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_address", ["address"])
    .index("by_expiresAt", ["expiresAt"]),

  messages: defineTable({
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
    read: v.boolean(),
  })
    .index("by_aliasId", ["aliasId"])
    .index("by_aliasId_and_mailTmId", ["aliasId", "mailTmId"]),
});
