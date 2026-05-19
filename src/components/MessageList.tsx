"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    const decrypt = async () => {
      const results = new Map<string, DecryptedMessage>();
      for (const msg of messages) {
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
          results.set(msg._id, {
            id: msg._id,
            ...plain,
            receivedAt: msg.receivedAt,
            read: msg.read,
          });
        } catch {
          // Decryption failure — skip message
        }
      }
      setDecrypted(results);
    };
    decrypt();
  }, [messages, cryptoKey]);

  const handleSelect = async (msg: DecryptedMessage, raw: EncryptedMessage) => {
    onSelect(msg);
    if (!raw.read) {
      await markRead({ messageId: raw._id }).catch(() => {});
    }
  };

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-slate-600">No messages yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 overflow-y-auto p-2">
      {messages.map((raw) => {
        const msg = decrypted.get(raw._id);
        const isSelected = raw._id === selectedId;

        return (
          <button
            key={raw._id}
            onClick={() => msg && handleSelect(msg, raw)}
            className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
              isSelected
                ? "bg-emerald-950/30 border border-emerald-600/40"
                : "border border-transparent hover:bg-[#1E293B]"
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className={`truncate text-xs ${raw.read ? "text-slate-500" : "font-semibold text-white"}`}>
                {msg?.from ?? "···"}
              </span>
              <span className="shrink-0 text-[10px] text-slate-600">
                {formatTime(raw.receivedAt)}
              </span>
            </div>
            <p className={`truncate text-xs ${raw.read ? "text-slate-600" : "text-slate-300"}`}>
              {msg?.subject ?? "Decrypting…"}
            </p>
          </button>
        );
      })}
    </div>
  );
}
