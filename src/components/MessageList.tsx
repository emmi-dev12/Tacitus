"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { decryptMessage } from "@/lib/crypto";

interface EncryptedMessage {
  _id: Id<"messages">;
  encryptedFrom: string;
  ivFrom: string;
  encryptedSubject: string;
  ivSubject: string;
  encryptedBodyPlain: string;
  ivBodyPlain: string;
  encryptedBodyHtml: string;
  ivBodyHtml: string;
  receivedAt: number;
  read: boolean;
}

interface DecryptedMessage {
  id: Id<"messages">;
  from: string;
  subject: string;
  bodyPlain: string;
  bodyHtml: string;
  receivedAt: number;
  read: boolean;
}

interface Props {
  messages: EncryptedMessage[];
  cryptoKey: CryptoKey;
  onSelect: (msg: DecryptedMessage) => void;
  selectedId?: Id<"messages">;
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function MessageList({ messages, cryptoKey, onSelect, selectedId }: Props) {
  const [decrypted, setDecrypted] = useState<Map<string, DecryptedMessage>>(new Map());
  const markRead = useMutation(api.messages.markRead);
  // Track which IDs are already decrypted to avoid redundant SubtleCrypto calls.
  // Must be cleared whenever cryptoKey changes to prevent serving stale plaintexts
  // from a previous session's key.
  const decryptedIds = useRef<Set<string>>(new Set());
  const prevKeyRef = useRef<CryptoKey | null>(null);

  useEffect(() => {
    // Reset the entire cache if the key changed (e.g., recovery restore, re-login).
    if (prevKeyRef.current !== null && prevKeyRef.current !== cryptoKey) {
      decryptedIds.current = new Set();
      setDecrypted(new Map());
    }
    prevKeyRef.current = cryptoKey;

    const newMessages = messages.filter((m) => !decryptedIds.current.has(m._id));
    if (newMessages.length === 0) return;

    let cancelled = false;

    (async () => {
      const results = await Promise.all(
        newMessages.map(async (msg) => {
          try {
            const plain = await decryptMessage(
              {
                encryptedFrom: msg.encryptedFrom,
                ivFrom: msg.ivFrom,
                encryptedSubject: msg.encryptedSubject,
                ivSubject: msg.ivSubject,
                encryptedBodyPlain: msg.encryptedBodyPlain,
                ivBodyPlain: msg.ivBodyPlain,
                encryptedBodyHtml: msg.encryptedBodyHtml,
                ivBodyHtml: msg.ivBodyHtml,
              },
              cryptoKey,
            );
            return [msg._id, { id: msg._id, ...plain, receivedAt: msg.receivedAt, read: msg.read }] as const;
          } catch {
            return null;
          }
        }),
      );

      if (cancelled) return;

      setDecrypted((prev) => {
        const next = new Map(prev);
        for (const entry of results) {
          if (entry) {
            next.set(entry[0], entry[1]);
            decryptedIds.current.add(entry[0]);
          }
        }
        return next;
      });
    })();

    return () => { cancelled = true; };
  }, [messages, cryptoKey]);

  const handleSelect = async (msg: DecryptedMessage, raw: EncryptedMessage) => {
    onSelect(msg);
    if (!raw.read) await markRead({ messageId: raw._id }).catch(() => {});
  };

  if (messages.length === 0) {
    return (
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.62rem", letterSpacing: "0.1em", color: "#1a2a36",
        fontFamily: "var(--font-space-mono), monospace",
      }}>
        no messages
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", overflowY: "auto", padding: "0.25rem" }}>
      {messages.map((raw) => {
        const msg = decrypted.get(raw._id);
        const isSelected = raw._id === selectedId;

        return (
          <button
            key={raw._id}
            onClick={() => msg && handleSelect(msg, raw)}
            style={{
              width: "100%", textAlign: "left",
              padding: "0.6rem 0.75rem", marginBottom: "0.1rem",
              background: isSelected ? "rgba(0,255,140,0.05)" : "transparent",
              border: isSelected ? "1px solid rgba(0,255,140,0.2)" : "1px solid transparent",
              cursor: "pointer",
              fontFamily: "var(--font-space-mono), monospace",
              transition: "all 0.1s",
            }}
            onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "rgba(0,255,140,0.02)"; }}
            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.2rem" }}>
              <span style={{
                fontSize: "0.68rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                color: raw.read ? "#2d4050" : "#c8d4e0",
                fontWeight: raw.read ? 400 : 700,
                flex: 1,
              }}>
                {msg?.from ?? "···"}
              </span>
              <span style={{ fontSize: "0.56rem", color: "#1a2a36", letterSpacing: "0.06em", flexShrink: 0 }}>
                {formatTime(raw.receivedAt)}
              </span>
            </div>
            <div style={{
              fontSize: "0.65rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              color: raw.read ? "#1a2a36" : "#4a6070",
            }}>
              {msg?.subject ?? "decrypting…"}
            </div>
          </button>
        );
      })}
    </div>
  );
}
